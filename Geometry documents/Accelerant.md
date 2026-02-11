# Accelerant Test Cases

Benchmarks to validate the claims in AI-Accelerant-Geometry.tex without
requiring billion-parameter training runs. Organised from cheapest (minutes
on a laptop) to most expensive (days on a single GPU).

---

## Tier 0 — Microbenchmarks (minutes, CPU only)

These test the raw algebraic claims: is spread arithmetic actually faster,
and does it actually preserve precision?

### Test 0.1: Spread vs Softmax — Raw FLOP Count

**Claim tested:** Spread-based scoring uses ~10x fewer FLOPs than softmax.

**Method:**
1. Generate random query/key vectors (d=64, 128, 512, 1024).
2. Compute attention scores both ways:
   - **Softmax path:** dot → scale → exp → sum → divide (standard attention)
   - **Cross path:** dot → square → quadrance → divide → (optional normalize)
3. Measure: wall-clock time, peak memory, FLOP count (via `torch.profiler`
   or manual counting).
4. Repeat at batch sizes 1, 32, 256, 1024.

**Expected result:** Cross path is faster for all d, with advantage growing
as batch size increases (no log-sum-exp trick needed).

**Implementation:** ~50 lines of PyTorch. No model needed.

```python
import torch, time

def softmax_attention(Q, K):
    scores = Q @ K.T / Q.shape[-1]**0.5
    return torch.softmax(scores, dim=-1)

def cross_attention(Q, K):
    dots = Q @ K.T
    Q_q = (Q * Q).sum(dim=-1, keepdim=True)
    Q_k = (K * K).sum(dim=-1, keepdim=True)
    cross = (dots * dots) / (Q_q * Q_k.T)
    return cross / cross.sum(dim=-1, keepdim=True)
```

### Test 0.2: Quantization Fidelity — Spread vs Softmax under INT8

**Claim tested:** Spread scores have O(1) quantization error vs O(L) for
softmax.

**Method:**
1. Compute attention scores in FP32 (ground truth).
2. Quantize Q, K to INT8, recompute scores.
3. Measure: max absolute error, mean absolute error, rank correlation
   (Spearman) between FP32 and INT8 score vectors.
4. Repeat for d = 64, 128, 512.

**Expected result:** Cross-normalized scores maintain higher rank
correlation under INT8 than softmax scores (because the algebraic
operations are closed over rationals).

**Implementation:** ~40 lines. Torch quantization utilities.

### Test 0.3: Weierstrass vs Sinusoidal — Speed and Precision

**Claim tested:** Weierstrass position encoding is faster and exactly
representable in fixed-point.

**Method:**
1. Generate position encodings for seq_len = 512, 2048, 8192.
2. Two paths:
   - **Sinusoidal:** `sin(pos / 10000^(2i/d))`, `cos(...)` — standard
   - **Weierstrass:** `2t/(1+t²)`, `(1-t²)/(1+t²)` — rational
3. Measure: wall-clock time per encoding.
4. Quantize both to INT8. Measure: reconstruction error vs FP32.

**Expected result:** Weierstrass is comparable speed in FP32 (both cached),
but INT8 reconstruction error is lower (exact rational vs transcendental).

### Test 0.4: Circulant vs Dense Matrix-Vector Product

**Claim tested:** Circulant 4×4 blocks are faster than dense 4×4 blocks.

**Method:**
1. Generate random vectors of dimension d (multiples of 4).
2. Apply transformation:
   - **Dense:** random d×d matrix multiply
   - **Block-circulant:** d/4 independent 4×4 circulant blocks (3 params each)
3. Measure: wall-clock time, parameter count.
4. Vary d from 64 to 4096.

**Expected result:** Block-circulant is faster and uses d×3/4 parameters
vs d² for dense. Speed advantage grows with d.

---

## Tier 1 — Component Replacement (hours, single GPU)

These test whether spread-based components are drop-in compatible with
existing small models without full retraining.

### Test 1.1: Attention Swap in GPT-2 Small (124M)

**Claim tested:** Spread/cross scoring can replace softmax in a pre-trained
model with minimal quality loss.

**Method:**
1. Load pre-trained GPT-2 Small (124M params).
2. Replace softmax attention with cross-normalized attention in all layers.
3. Evaluate perplexity on Wikitext-2 **without any fine-tuning**.
4. Fine-tune for 1000 steps on Wikitext-2.
5. Evaluate perplexity again.

**Expected result:**
- Without fine-tuning: perplexity degrades (different score distribution)
- After 1000 steps: perplexity recovers to within 10-15% of original
- Key metric: **how fast does it recover?** If spread-based scoring is
  geometrically compatible, recovery should be fast.

**Cost:** ~2 hours on a single A100 (fine-tuning 1000 steps).

### Test 1.2: Position Encoding Swap in GPT-2 Small

**Claim tested:** Weierstrass position encoding is functionally equivalent
to sinusoidal.

**Method:**
1. Load GPT-2 Small.
2. Replace sinusoidal position embeddings with Weierstrass encodings
   (matched frequency schedule).
3. Evaluate perplexity without fine-tuning.
4. Fine-tune 1000 steps.

**Expected result:** Minimal perplexity impact (position encoding carries
the same geometric information via different parameterization).

### Test 1.3: Quantization Stress Test — Spread vs Softmax at INT4

**Claim tested:** Spread-based models degrade less under aggressive
quantization.

**Method:**
1. Take GPT-2 Small with softmax attention (baseline).
2. Take GPT-2 Small with cross-normalized attention (from Test 1.1,
   after fine-tuning).
3. Quantize both to INT4 using GPTQ or AWQ.
4. Evaluate perplexity on Wikitext-2.
5. Measure: perplexity ratio (INT4 / FP32) for each model.

**Expected result:** Spread-based model has lower perplexity ratio
(degrades less), because its core operations are rational.

**This is the critical experiment.** If the quantization prediction holds,
the algebraic argument is validated. If it fails, the paper's strongest
claim collapses.

---

## Tier 2 — Small-Scale Training (days, single GPU)

These test whether spread-based architectures can be trained from scratch
competitively.

### Test 2.1: Train Spread-GPT from Scratch (25M params)

**Claim tested:** A spread-based transformer can be trained competitively
at small scale.

**Method:**
1. Define a GPT-2-style architecture (6 layers, 6 heads, d=384) but with:
   - Cross-normalized attention (Eq. 5 from whitepaper)
   - Weierstrass position encoding
   - Standard FFN layers (unchanged)
2. Train on OpenWebText subset (~1B tokens) for 50K steps.
3. Compare: perplexity vs standard GPT-2 trained identically.

**Expected result:** Within 15% perplexity of standard GPT-2 at same scale.
The interesting metric is **training efficiency** — does spread-based
training converge faster (fewer steps to same perplexity)?

**Cost:** ~8 hours on a single A100.

### Test 2.2: Janus Polarity Ablation

**Claim tested:** The Z₂ polarity bit improves semantic discrimination.

**Method:**
1. Train two 25M-param models identically:
   - **Model A:** Cross-normalized attention (unsigned)
   - **Model B:** Signed cross attention with Janus polarity (Eq. from
     Objection 5 response)
2. Evaluate on:
   - Perplexity (Wikitext-2)
   - Semantic similarity benchmark (STS-B) — specifically: synonym vs
     antonym discrimination
   - Natural language inference (SNLI)

**Expected result:** Model B outperforms on tasks requiring polarity
(antonym detection, negation handling). Model A may match on perplexity
alone.

### Test 2.3: Hybrid Geometric-Transformer

**Claim tested:** Geometric layers work best as efficient mid-network
backbone.

**Method:**
1. 12-layer GPT-2-style model (25M params).
2. Three variants:
   - **All-softmax:** Standard GPT-2 (baseline)
   - **All-spread:** Cross-normalized attention throughout
   - **Hybrid:** Layers 1-2 and 11-12 use softmax; layers 3-10 use
     spread-based attention
3. Train identically on 1B tokens.

**Expected result:** Hybrid performs best — softmax at boundaries handles
the "translation" between token space and geometric space, while spread
layers provide efficient geometric computation in the interior.

---

## Tier 3 — Distillation (days, multi-GPU)

### Test 3.1: Distill Llama-3 8B → Spread-Llama 1B

**Claim tested:** Geometric algebra is an efficient distillation target.

**Method:**
1. Teacher: Llama-3 8B (pre-trained, frozen).
2. Student: 1B-param model with spread-based attention.
3. Distill on 10B tokens using standard KD loss.
4. Compare: student quality vs standard 1B transformer distilled
   identically.

**Expected result:** Spread-based student preserves more teacher quality
per parameter, because its algebraic operations are a better match for the
geometric transformations the teacher learned.

**Cost:** ~3 days on 4× A100. Expensive but tractable.

### Test 3.2: RWKV Channel Mixing with Spread Scoring

**Claim tested:** Spread algebra is composable with non-transformer
architectures (Objection 4 response).

**Method:**
1. Take RWKV-4 169M (pre-trained).
2. Replace channel mixing softmax with cross-normalized scoring.
3. Fine-tune 1000 steps.
4. Quantize both (original and spread-variant) to INT4.
5. Compare perplexity degradation.

**Expected result:** Spread variant degrades less under INT4, validating
the "algebra is orthogonal to architecture" claim.

---

## Priority Order

If resources are limited, run tests in this order:

| Priority | Test | Cost | What it validates |
|----------|------|------|-------------------|
| 1 | 0.1 | 5 min | Raw speed claim |
| 2 | 0.2 | 5 min | Quantization precision claim |
| 3 | 0.3 | 5 min | Weierstrass speed/precision |
| 4 | 1.3 | 3 hrs | **Critical: INT4 degradation** |
| 5 | 1.1 | 2 hrs | Drop-in compatibility |
| 6 | 2.1 | 8 hrs | From-scratch viability |
| 7 | 2.3 | 8 hrs | Hybrid architecture |
| 8 | 3.2 | 1 day | Cross-architecture composability |
| 9 | 2.2 | 8 hrs | Janus polarity value |
| 10 | 3.1 | 3 days | Distillation efficiency |

Tests 0.1–0.3 can be run today on any machine with PyTorch. Test 1.3 is
the make-or-break experiment. If spread-based attention degrades less under
INT4 quantization than softmax attention, the algebraic argument holds
and everything else follows.

---

## Success Criteria

**The paper's claims survive if:**
1. Tier 0 confirms raw speed and precision advantages (expected: yes)
2. Test 1.3 confirms quantization resilience (predicted: yes, critical)
3. Test 2.1 achieves within 15% perplexity of baseline (feasible)

**The paper's claims require revision if:**
1. Spread-based scoring is not measurably faster (Tier 0 fails)
2. INT4 degradation is equivalent for both methods (Test 1.3 fails)
3. From-scratch training diverges or produces >30% worse perplexity

**The paper's claims are falsified if:**
1. Cross-normalized attention cannot learn useful representations at all
2. Quantization error is actually **worse** for spread (would indicate the
   rational closure property does not hold in practice due to accumulator
   overflow or similar)
