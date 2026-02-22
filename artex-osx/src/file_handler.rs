//! file_handler.rs — State persistence: JSON save/load, auto-save, native file dialogs.
//!
//! Junior Phase: J3
//! Status: Stub — no functionality implemented yet.
//! Port from: modules/rt-filehandler.js
//!
//! Dependencies (add to Cargo.toml when implementing):
//!   serde = { version = "1", features = ["derive"] }
//!   serde_json = "1"
//!   rfd = "0.15"   (native macOS NSOpenPanel / NSSavePanel)

// TODO: AppStateSnapshot struct (serde-serializable mirror of AppState)
// TODO: save_to_json(state, path) -> Result<()>
// TODO: load_from_json(path) -> Result<AppStateSnapshot>
// TODO: auto_save(state) — write to ~/.artexplorer/autosave.json every N rebuilds
// TODO: open_file_dialog() -> Option<PathBuf>  (rfd native panel)
// TODO: save_file_dialog() -> Option<PathBuf>  (rfd native panel)

#[cfg(test)]
mod tests {
    // TODO: tests land with implementation
}
