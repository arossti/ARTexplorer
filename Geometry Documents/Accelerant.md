# Accelerant Test Cases

Benchmarks to validate the claims in AI-Accelerant-Geometry.tex without
requiring billion-parameter training runs. Organised from cheapest (minutes
on a laptop) to most expensive (days on a single GPU).

---

## Tier 0 — Microbenchmarks (minutes, CPU only)

These test the raw algebraic properties: does spread arithmetic preserve
precision under quantization, and what are its actual compute characteristics?

### Test 0.1: Spread vs Softmax — Normalization Step Profiling

**Claim tested:** Cross-normalization is algebraically exact where softmax
is not. (The paper does NOT claim overall FLOP reduction — the QK^T matmul
at O(n²d) dominates both paths equally.)

**Method:**
1. Generate random query/key vectors (d=64, 128, 512, 1024).
2. Compute attention scores both ways:
   - **Softmax path:** dot → scale → exp → sum → divide (standard attention)
   - **Cross path:** dot → square → quadrance → divide → (optional normalize)
3. Measure: wall-clock time, peak memory, FLOP count (via `torch.profiler`
   or manual counting).
4. Repeat at batch sizes 1, 32, 256, 1024.
5. **Also measure:** numerical determinism — run each path 100 times on the
   same input and check whether outputs are bit-identical across runs.

**Expected result:** Cross path produces bit-identical outputs every run
(rational arithmetic is deterministic). Softmax path may vary across
platforms/runs due to exp() implementation differences. Wall-clock
difference for the normalization step alone will be small — the interesting
metric is exactness, not speed.

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

**Claim tested:** Within the normalization step specifically, cross-scoring
introduces less quantization error than softmax (because the operations are
closed over rationals). The paper is explicit that this does NOT address the
dominant sources of quantization error (weight distributions, activation
outliers) — it only tests the scoring path.

**Method:**
1. Compute attention scores in FP32 (ground truth).
2. Quantize Q, K to INT8, recompute scores.
3. Measure: max absolute error, mean absolute error, rank correlation
   (Spearman) between FP32 and INT8 score vectors.
4. Repeat for d = 64, 128, 512.
5. **Also measure:** which score entries change rank order under INT8?
   If spread preserves rank order better, attention routing decisions
   are more stable under quantization — even if absolute error is similar.

**Expected result:** Cross-normalized scores maintain higher rank
correlation under INT8 than softmax scores. The magnitude of the
difference tells us whether this matters in practice or is negligible.

**Implementation:** ~40 lines. Torch quantization utilities.

### Test 0.3: Weierstrass vs Sinusoidal — Fixed-Point Fidelity

**Claim tested:** Weierstrass parametrization is exactly representable in
fixed-point arithmetic. The paper acknowledges this is a niche application
(edge/embedded inference, learned rotation parameters) — NOT a general LLM
optimization, since sinusoidal encodings are computed once and cached.

**Method:**
1. Generate position encodings for seq_len = 512, 2048, 8192.
2. Two paths:
   - **Sinusoidal:** `sin(pos / 10000^(2i/d))`, `cos(...)` — standard
   - **Weierstrass:** `2t/(1+t²)`, `(1-t²)/(1+t²)` — rational
3. Measure: wall-clock time per encoding (expect similar — both are fast).
4. Quantize both to INT8. Measure: reconstruction error vs FP32.
5. **Also test in pure integer mode:** compute Weierstrass with integer-only
   arithmetic (no float at all). This simulates an embedded/ASIC context
   where the advantage is real.

**Expected result:** In FP32, both are equivalent (computed once, cached).
In INT8, Weierstrass has lower reconstruction error. In pure integer mode,
only Weierstrass is feasible. The interesting finding may be whether the
INT8 advantage is large enough to matter for any downstream task.

### Test 0.4: Circulant vs Dense — Parameter Efficiency and Quality

**Claim tested:** Block-circulant structure provides parameter efficiency
(3d/4 params vs d² for dense), acting as an algebraic inductive bias.
The paper does NOT claim FFT speedup at 3×3 block size — the advantage
is structured sparsity and regularization, not asymptotic complexity.

**Method:**
1. Generate random vectors of dimension d (multiples of 4).
2. Apply transformation:
   - **Dense:** random d×d matrix multiply
   - **Block-circulant:** d/4 independent 4×4 circulant blocks (3 params each)
3. Measure: wall-clock time, parameter count, and output rank/expressiveness.
4. Vary d from 64 to 4096.
5. **Also measure:** fit a small regression or classification task with both
   parameterizations. Does circulant structure hurt expressiveness, or does
   the regularization help generalization (like conv layers)?

**Expected result:** Block-circulant uses 3d/4 parameters vs d² for dense.
Speed may be similar or slightly faster (memory-bound, not compute-bound at
small block size). The interesting question is whether the structured
constraint helps or hurts on a downstream task — this could go either way.

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

**Claim tested:** Weierstrass position encoding carries equivalent geometric
information to sinusoidal. The paper frames this as niche (edge/embedded),
but the test is worth running: if Weierstrass encodings are functionally
equivalent, they unlock pure-integer inference pipelines for embedded
deployment — and unexpected interactions with other components could reveal
something about how position information propagates through layers.

**Method:**
1. Load GPT-2 Small.
2. Replace learned position embeddings with Weierstrass encodings
   (matched frequency schedule via rational parameter grid).
3. Evaluate perplexity without fine-tuning.
4. Fine-tune 1000 steps.
5. **Also try:** Weierstrass encodings with purely integer parameter
   schedules (simulating embedded deployment).

**Expected result:** Minimal perplexity impact (position encoding carries
the same geometric information via different parameterization). The integer-
only variant may degrade slightly depending on parameter grid resolution.

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
at small scale. This is the minimum viability test — if cross-normalization
cannot learn at all, everything else is moot.

**Method:**
1. Define a GPT-2-style architecture (6 layers, 6 heads, d=384) but with:
   - Cross-normalized attention (Eq. 5 from whitepaper)
   - Standard learned position embeddings (unchanged — isolate the attention
     variable; Weierstrass position encoding is a separate, niche claim)
   - Standard FFN layers (unchanged)
2. Train on OpenWebText subset (~1B tokens) for 50K steps.
3. Compare: perplexity vs standard GPT-2 trained identically.
4. **Also track:** gradient magnitudes through the cross-normalization path.
   Does the squared dot product create gradient flow issues (vanishing near
   orthogonal vectors, exploding near parallel)?

**Expected result:** Within 15% perplexity of standard GPT-2 at same scale.
The interesting metric is **training efficiency** — does spread-based
training converge faster (fewer steps to same perplexity)? Also watch for
unexpected gradient dynamics from the squaring operation.

**Cost:** ~8 hours on a single A100.

### Test 2.2: Janus Polarity Ablation

**Claim tested:** The Z₂ polarity bit (restoring sgn(q·k) alongside the
squared cross score) recovers sign information lost by squaring the dot
product. The paper frames this as addressing a genuine technical limitation
of cross-normalization — not as a semantic theory about antonyms/synonyms.

**Method:**
1. Train two 25M-param models identically:
   - **Model A:** Cross-normalized attention (unsigned — (q·k)² only)
   - **Model B:** Signed cross attention with Janus polarity:
     α_i = sgn(q·k_i) · c(q, k_i) / Σ|c(q, k_j)|
2. Evaluate on:
   - Perplexity (Wikitext-2)
   - Natural language inference (SNLI)
   - Negation sensitivity: does Model B handle "not X" differently from "X"?
3. **Also examine:** attention pattern visualization — do signed and unsigned
   models route attention differently? Where do negative dot products occur
   in practice, and does the sign bit change which tokens get attended to?

**Expected result:** Model B likely outperforms on tasks where negation or
contrast matters. Model A may match on raw perplexity. The interesting
finding is whether sign information matters *enough* to justify the extra
channel — this could go either way, and a null result is informative.

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
| 1 | 0.2 | 5 min | **Core claim: quantization fidelity of scoring path** |
| 2 | 0.1 | 5 min | Determinism and compute profile of cross-normalization |
| 3 | 1.1 | 2 hrs | Drop-in compatibility (can cross replace softmax?) |
| 4 | 1.3 | 3 hrs | **Critical: INT4 degradation in a real model** |
| 5 | 0.3 | 5 min | Weierstrass fixed-point fidelity (niche but cheap) |
| 6 | 0.4 | 5 min | Circulant parameter efficiency (cheap, may surprise) |
| 7 | 2.1 | 8 hrs | From-scratch viability |
| 8 | 2.3 | 8 hrs | Hybrid architecture |
| 9 | 2.2 | 8 hrs | Janus polarity — does sign matter? |
| 10 | 1.2 | 2 hrs | Weierstrass position encoding swap |
| 11 | 3.2 | 1 day | Cross-architecture composability (RWKV) |
| 12 | 3.1 | 3 days | Distillation efficiency |

Tests 0.1–0.4 can be run today on any machine with PyTorch. Test 1.3 is
the make-or-break experiment. If spread-based attention degrades less under
INT4 quantization than softmax attention, the algebraic argument holds.

**Important:** every test is also an exploration. The prime polygon
projections emerged from the snub tetrahedron unexpectedly — similarly,
a "failed" test here might reveal structure we didn't anticipate. Record
all results, including surprises and null findings.

---

## Success Criteria

**The paper's core claim (rational closure of scoring) survives if:**
1. Test 0.2 confirms cross-normalization has lower scoring-path error under INT8
2. Test 1.3 confirms measurable quantization resilience in a real model
3. Test 1.1 shows cross-normalization is a viable drop-in (recovers with fine-tuning)

**The paper's secondary claims need revision if:**
1. Circulant structure provides no expressiveness benefit (Test 0.4 → parameter
   efficiency only, no quality gain)
2. Weierstrass shows no advantage even in integer-only mode (Test 0.3)
3. Janus polarity makes no measurable difference (Test 2.2 → sign may not matter)

**The paper's core claim is falsified if:**
1. Cross-normalized attention cannot learn useful representations at all
   (Test 1.1 never recovers, Test 2.1 diverges)
2. Quantization error is actually **worse** for spread-based scoring
   (would indicate accumulator overflow or dynamic range issues negate
   the rational closure property)
3. INT4 degradation is identical for both methods (Test 1.3 null result →
   the scoring path contribution is too small to measure)

**Unexpected findings to watch for:**
- Does cross-normalization change *which* tokens get attended to, even when
  perplexity is similar? (Attention pattern analysis in Tests 1.1, 2.2)
- Does the hybrid architecture (Test 2.3) reveal that geometric layers work
  better at specific depths? (Analogous to how prime projections only appear
  at specific orientations)
- Does block-circulant structure (Test 0.4) produce any emergent geometric
  regularity in the learned transforms?
