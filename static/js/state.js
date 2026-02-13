const State = {
    currentNote: null,
    setCurrentNote(note) {
        this.currentNote = note;
    },
    getCurrentNote() {
        return this.currentNote;
    }
};
export default State;