export const ApiService = {
    async findSubstitute(absentTeacher, schedule) {
        try {
            const response = await fetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ absentTeacher, schedule })
            });
            return await response.json();
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    },

    async shareNote(data) {
        const response = await fetch('/api/share-note', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    }
};