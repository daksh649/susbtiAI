
/* main.js */
import State from './state.js';
import { ApiService } from './api.js';

// ... your existing nicePrompt function ...      // ✅ 1. THE "NICE PROMPT" FUNCTION
function nicePrompt(message, defaultValue = "") {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-prompt-modal');
        const msgEl = document.getElementById('prompt-message');
        const inputEl = document.getElementById('prompt-input');
        const confirmBtn = document.getElementById('prompt-confirm-btn');
        const cancelBtn = document.getElementById('prompt-cancel-btn');

        // Setup UI
        msgEl.textContent = message;
        inputEl.value = defaultValue;
        modal.style.display = 'block';
        inputEl.focus();

        // Cleanup function
        const cleanup = () => {
            modal.style.display = 'none';
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            inputEl.onkeydown = null;
        };

        // Handlers
        confirmBtn.onclick = () => { cleanup(); resolve(inputEl.value.trim()); };
        cancelBtn.onclick = () => { cleanup(); resolve(null); };
        
        inputEl.onkeydown = (e) => {
            if (e.key === 'Enter') confirmBtn.click();
            if (e.key === 'Escape') cancelBtn.click();
        };
    });
}
        const backBtn = document.getElementById('back-btn');
        const forwardBtn = document.getElementById('forward-btn');
        const menuBtn = document.getElementById('menu-btn');
        const newFileBtn = document.getElementById('new-file-btn');
        const copyBtn = document.getElementById('copy-btn');
        const audioBtn = document.getElementById('audio-btn');
        const viewToggleBtn = document.getElementById('view-toggle-btn');
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        const profileBtn = document.getElementById('profile-btn');
        const searchInput = document.getElementById('search-input');
        const sidebar = document.getElementById('sidebar');
        const notesGrid = document.getElementById('notes-grid');
        const profilePopup = document.getElementById('profile-popup');
        const folderList = document.getElementById('folder-list');
        const newFolderBtn = document.getElementById('new-folder-btn');
        const currentFolderHeader = document.getElementById('current-folder-header');
        const substitutionModal = document.getElementById('substitution-modal');
        const modalClose = document.getElementById('modal-close');
        const substitutionFormContainer = document.getElementById('substitution-form-container');
        const settingsBtn = document.getElementById('settings-btn');
        const settingsPanel = document.getElementById('settings-panel');
        const settingsClose = document.getElementById('settings-close');
        const themeSelect = document.getElementById('theme-select');
        const saveSettingsBtn = document.getElementById('save-settings-btn');

        let history = [];
        let historyIndex = -1;
        let selectedNote = null;
        let isGridView = true;
        let activeFolder = 'All iCloud';
        let currentNote = null;
        let isFullscreen = false;

        function getFormattedTimestamp() {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);

            const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            const noteDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            if (noteDate.getTime() === today.getTime()) {
                return `Today, ${time}`;
            } else if (noteDate.getTime() === yesterday.getTime()) {
                return `Yesterday, ${time}`;
            } else {
                return `${now.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
            }
        }

        function loadNotes(folderName = activeFolder, query = '') {
            notesGrid.innerHTML = '';
            const savedNotes = JSON.parse(localStorage.getItem('notes')) || [];
            let filteredNotes = savedNotes.filter(note => note.folder === folderName);
            if (query) {
                const lowerQuery = query.toLowerCase();
                filteredNotes = filteredNotes.filter(note => 
                    note.title.toLowerCase().includes(lowerQuery) || 
                    note.content.toLowerCase().includes(lowerQuery) || 
                    note.timestamp.toLowerCase().includes(lowerQuery)
                );
            }
            filteredNotes.forEach(note => {
                const newNote = document.createElement('div');
                newNote.classList.add('note-card');
                newNote.innerHTML = `
                    <div class="note-content">${note.content}</div>
                    <div class="note-title">${note.title}</div>
                    <div class="note-date">${note.timestamp}</div>
                `;
                newNote.dataset.id = note.id;
                newNote.addEventListener('click', () => openSubstitutionForm(note));
                notesGrid.appendChild(newNote);
            });
            currentFolderHeader.querySelector('span').textContent = folderName;
        }

        function saveNote(content, title, timestamp, folder, scheduleData = null) {
            const savedNotes = JSON.parse(localStorage.getItem('notes')) || [];
            const id = Date.now().toString();
            const note = { id, content, title, timestamp, folder, scheduleData };
            savedNotes.unshift(note);
            localStorage.setItem('notes', JSON.stringify(savedNotes));
            updateFolderCounts();
            return note;
        }

        function updateNote(noteId, scheduleData) {
            const savedNotes = JSON.parse(localStorage.getItem('notes')) || [];
            const noteIndex = savedNotes.findIndex(note => note.id === noteId);
            if (noteIndex !== -1) {
                savedNotes[noteIndex].scheduleData = scheduleData;
                localStorage.setItem('notes', JSON.stringify(savedNotes));
                return true;
            }
            return false;
        }

/* ==========================================
   FOLDER SYSTEM (REPAIRED)
   ========================================== */

function loadFolders() {
    // 1. Define Professional "School" Defaults
    const defaultFolders = [
        { name: 'Master Schedule', icon: '📅', count: 0, active: true },
        { name: 'Math Dept', icon: '📐', count: 0 },
        { name: 'Science Dept', icon: '🧬', count: 0 },
        { name: 'English Dept', icon: '📚', count: 0 },
        { name: 'Staff Alerts', icon: '⚠️', count: 0 }
    ];

    // 2. Get User's Private Folders from Storage
    let userFolders = JSON.parse(localStorage.getItem('folders'));

    // If first time (no folders), use defaults
    if (!userFolders || userFolders.length === 0) {
        userFolders = defaultFolders;
        localStorage.setItem('folders', JSON.stringify(userFolders));
    }

    // 3. Render the List
    const folderList = document.getElementById('folder-list'); // Ensure this ID matches your HTML
    folderList.innerHTML = '';

    userFolders.forEach(folder => {
        const folderItem = document.createElement('div');
        folderItem.classList.add('folder-item');
        if (folder.name === activeFolder) folderItem.classList.add('active');

        // Use a generic icon if none saved
        const icon = folder.icon || '📁';
        
        folderItem.innerHTML = `
            <span class="icon">${icon}</span> ${folder.name} <span class="count">${folder.count || 0}</span>
        `;
        
        // Click Event to switch folders
        folderItem.addEventListener('click', () => {
            document.querySelectorAll('.folder-item').forEach(item => item.classList.remove('active'));
            folderItem.classList.add('active');
            activeFolder = folder.name;
            // If you have a loadNotes function, call it here:
            if (typeof loadNotes === "function") loadNotes(activeFolder);
        });
        
        folderList.appendChild(folderItem);
    });

    // 4. Update counts (Safe call, no infinite loop)
    updateFolderCounts(); 
}

function saveFolder(name) {
    if (!name) return;
    
    // Get existing
    const folders = JSON.parse(localStorage.getItem('folders')) || [];
    
    // Add new one
    folders.push({ name: name, icon: '📁', count: 0 });
    
    // Save
    localStorage.setItem('folders', JSON.stringify(folders));
    
    // Refresh UI
    loadFolders();
}

function updateFolderCounts() {
    // Get Data
    const notes = JSON.parse(localStorage.getItem('notes')) || [];
    let folders = JSON.parse(localStorage.getItem('folders')) || [];
    
    // Calculate
    folders.forEach(folder => {
        folder.count = notes.filter(note => note.folder === folder.name).length;
    });
    
    // Save back to storage
    localStorage.setItem('folders', JSON.stringify(folders));
    
    // CRITICAL FIX: Do NOT call loadFolders() here.
    // This stops the "Maximum call stack size exceeded" crash.
}

        function toggleFullscreen() {
            if (!isFullscreen) {
                document.documentElement.requestFullscreen().then(() => {
                    isFullscreen = true;
                    fullscreenBtn.textContent = '🗗';
                    fullscreenBtn.title = 'Exit Fullscreen';
                }).catch(err => {
                    alert(`Error entering fullscreen: ${err.message}`);
                });
            } else {
                document.exitFullscreen().then(() => {
                    isFullscreen = false;
                    fullscreenBtn.textContent = '⛶';
                    fullscreenBtn.title = 'Toggle Fullscreen';
                }).catch(err => {
                    alert(`Error exiting fullscreen: ${err.message}`);
                });
            }
        }
function openSubstitutionForm(note) {
    currentNote = note;
    substitutionModal.style.display = 'block';
    const today = new Date().toISOString().split('T')[0];
    
    // --- 1. LOAD EXCEL LIBRARY ---
    if (!window.XLSX) {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
        document.head.appendChild(script);
    }

    // --- STATE HISTORY (For Undo) ---
    let historyStack = [];
    const saveState = () => {
        const tbody = document.querySelector('#teacher-schedule tbody');
        if (tbody) {
            historyStack.push(tbody.innerHTML);
            if (historyStack.length > 50) historyStack.shift();
        }
    };

    // --- 2. INJECT PRO DASHBOARD HTML ---
    substitutionFormContainer.innerHTML = `
        <div class="modal-header">
            <h1>Substitution Manager</h1>
            <div style="display:flex; align-items:center; gap:15px;">
                <div class="status-badge">System Online</div>
                <span id="pro-close-btn" class="close" style="font-size:28px; cursor:pointer; color:#94a3b8;">&times;</span>
            </div>
        </div>

        <div class="smart-dashboard">
            <div class="dropdown-row">
                <div class="input-group">
                    <label>Select Absent Teacher</label>
                    <select id="absent-teacher">${Array.from({ length: 35 }, (_, i) => `<option value="Teacher ${i + 1}">Teacher ${i + 1}</option>`).join('')}</select>
                </div>
                <div class="input-group">
                    <label>Target Class (Manual)</label>
                    <select id="class-section">
                        <option value="9-A">9-A</option><option value="9-B">9-B</option>
                        <option value="10-A">10-A</option><option value="10-B">10-B</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Date</label>
                    <input type="date" value="${today}">
                </div>
            </div>

            <div class="hero-actions">
                <button id="ai-assign-btn" class="hero-btn ai-btn">
                    <span class="icon">✨</span> Auto-Assign (Server)
                </button>
                <button id="voice-btn" class="hero-btn voice-btn" onclick="window.startVoiceOverride()">🎤 Voice</button>
                <button class="hero-btn qr-btn">📷 Scan</button>
            </div>
            <div id="resultsContainer"></div>
        </div>

        <div class="divider"><button class="tools-toggle" onclick="var p=document.getElementById('admin-panel');p.style.display=p.style.display==='grid'?'none':'grid'">⚙️ Advanced Tools</button></div>
        
        <div id="admin-panel" style="display:none; grid-template-columns:repeat(4,1fr); gap:10px; padding:20px; background:#020617; margin-top:10px; border:1px solid #1e293b; border-radius:12px;">
            <div style="grid-column: span 4; display:flex; gap:10px; margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid #334155;">
                <select id="manual-sub" style="background:#0f172a; color:white; border:1px solid #334155; padding:10px; flex:1; border-radius:6px;">
                    <option value="">Select Manual Substitute...</option>
                    ${Array.from({ length: 35 }, (_, i) => `<option value="Teacher ${i + 1}">Teacher ${i + 1}</option>`).join('')}
                </select>
                <button id="manual-assign-btn" style="background:#2563eb; color:white; border:none; border-radius:6px; font-weight:bold; padding:0 20px; cursor:pointer;">Assign</button>
            </div>
            
            <button id="undo-btn" class="tool-btn" style="background:#1e293b; color:#cbd5e1; border:1px solid #334155; padding:10px; border-radius:6px;">↩️ Undo</button>
            <button id="reset-btn" class="tool-btn" style="background:#1e293b; color:#fca5a5; border:1px solid #7f1d1d; padding:10px; border-radius:6px;">🔥 Reset</button>
            <button id="toggle-edit-btn" class="tool-btn" style="background:#1e293b; color:#cbd5e1; border:1px solid #334155; padding:10px; border-radius:6px;">✏️ Edit Mode</button>
            <button id="import-excel-btn" class="tool-btn" style="background:#1e293b; color:#10b981; border:1px solid #059669; padding:10px; border-radius:6px;">📥 Import Excel</button>
            <input type="file" id="file-input" accept=".xlsx, .xls, .csv" style="display:none;" />
        </div>

        <div id="schedule-container" style="padding:20px; overflow-x:auto;">
            <table id="teacher-schedule" style="width:100%; border-collapse:collapse; color:#cbd5e1; font-size:13px;">
                <thead>
                    <tr style="background:#1e293b; color:#22d3ee; text-transform:uppercase; font-size:11px;">
                        <th style="padding:12px;">Teacher</th>
                        <th style="padding:12px;">P1</th><th style="padding:12px;">P2</th><th style="padding:12px;">P3</th>
                        <th style="padding:12px;">P4</th><th style="padding:12px;">P5</th><th style="padding:12px;">P6</th>
                        <th style="padding:12px;">P7</th><th style="padding:12px;">P8</th><th style="padding:12px;">P9</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    // --- 3. LOGIC INITIALIZATION ---
    setTimeout(() => {
        document.getElementById('pro-close-btn').onclick = () => substitutionModal.style.display = 'none';

        // A. INITIAL DATA POPULATION (REALISTIC DATA FOR TESTING)
        // This solves your issue of "all periods free so checking is difficult"
        const tbody = document.querySelector('#teacher-schedule tbody');
        const realisticSubjects = ['9-A (Math)', '10-B (Sci)', '11-A (Eng)', '12-A (Hist)', 'Library', 'Games'];

        for (let i = 1; i <= 35; i++) {
            const tr = document.createElement('tr');
            const tName = `Teacher ${i}`;
            let html = `<td style="padding:12px; border-bottom:1px solid #1e293b; color:white; font-weight:600;">${tName}</td>`;
            
            for (let p = 1; p <= 9; p++) {
                // 50% chance of having a class (Busy)
                const isBusy = Math.random() > 0.5;
                let content = "Free";
                let color = "#475569"; // Free color

                if (isBusy) {
                    content = realisticSubjects[Math.floor(Math.random() * realisticSubjects.length)];
                    color = "#cbd5e1"; // Busy color
                    if (content === 'Library' || content === 'Games') color = '#a5b4fc';
                }

                html += `<td id="${tName}-p${p}" class="schedule-cell" style="padding:12px; border-bottom:1px solid #1e293b; color:${color};">${content}</td>`;
            }
            tr.innerHTML = html;
            tbody.appendChild(tr);
        }
        
        // Save initial state for "Reset"
        let initialHTML = tbody.innerHTML;

        // B. AUTO-ASSIGN LOGIC (SEND TO PYTHON)
        document.getElementById('ai-assign-btn').onclick = async function() {
            const btn = this;
            const absentTeacher = document.getElementById('absent-teacher').value;
            const container = document.getElementById('resultsContainer');
            
            saveState(); // Save for Undo
            btn.innerHTML = '⚡ Processing Logic...';

            // Scrape table
            let scheduleSnapshot = {};
            document.querySelectorAll('#teacher-schedule tbody tr').forEach(tr => {
                let name = tr.cells[0].textContent;
                let periods = Array.from(tr.cells).slice(1).map(td => td.textContent);
                scheduleSnapshot[name] = periods;
            });

            try {
                const response = await fetch('/api/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ absentTeacher: absentTeacher, schedule: scheduleSnapshot })
                });

                const data = await response.json();
                let reportHTML = '';
                
                if (data.assignments && data.assignments.length > 0) {
                    data.assignments.forEach(task => {
                        const cell = document.getElementById(`${absentTeacher}-p${task.period}`);
                        if (cell) {
                            // Update UI
                            cell.innerHTML = task.substitute;
                            cell.style.fontWeight = 'bold';
                            
                            if (task.status === "SUCCESS") {
                                cell.style.color = '#38bdf8';
                                cell.style.border = '1px solid #0ea5e9';
                                cell.style.background = 'rgba(14,165,233,0.1)';
                                
                                reportHTML += `
                                <div style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12px;">
                                    <div style="color:#cbd5e1;">P${task.period}: ${task.original} <span style="color:#38bdf8;">➜ ${task.substitute}</span></div>
                                    <div style="color:#64748b; font-size:10px; margin-top:2px;">Score: ${task.score} (${task.details})</div>
                                </div>`;
                            } else {
                                // Fallback Case (Study Period)
                                cell.style.color = '#facc15';
                                cell.style.border = '1px dashed #facc15';
                                
                                reportHTML += `
                                <div style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12px;">
                                    <div style="color:#facc15;">P${task.period}: Fallback to ${task.substitute}</div>
                                </div>`;
                            }
                        }
                    });
                    
                    container.innerHTML = `
                        <div class="gold-card" style="background:#0f172a; border:1px solid #0ea5e9; padding:15px; border-radius:12px; margin-top:20px;">
                            <h3 style="margin:0 0 10px 0; font-size:14px; color:white;">Logic Optimization Complete</h3>
                            <div style="max-height:150px; overflow-y:auto;">${reportHTML}</div>
                        </div>`;
                } else {
                    alert("Teacher has no active classes to substitute.");
                }

            } catch (error) {
                console.error(error);
                alert("Server Error. Check Python Console.");
            }
            btn.innerHTML = '<span class="icon">✨</span> Auto-Assign (Server)';
        };

        // C. VOICE COMMAND
        window.startVoiceOverride = () => {
            const btn = document.getElementById('voice-btn');
            if (!('webkitSpeechRecognition' in window)) { alert("Use Chrome"); return; }
            const r = new webkitSpeechRecognition();
            r.lang = 'en-US';
            r.onstart = () => { btn.innerHTML = "🔴 Listening..."; btn.style.background = "#ef4444"; };
            r.onresult = (e) => {
                const t = e.results[0][0].transcript.toLowerCase();
                const m = t.match(/teacher\s?(\d+)/);
                if (m) {
                    const id = `Teacher ${m[1]}`;
                    const sel = document.getElementById('absent-teacher');
                    for (let i=0; i<sel.options.length; i++) if(sel.options[i].value === id) sel.value = id;
                    setTimeout(() => document.getElementById('ai-assign-btn').click(), 500);
                }
                btn.innerHTML = "🎤 Voice"; btn.style.background = "";
            };
            r.start();
        };

        // D. ADVANCED TOOLS IMPLEMENTATION
        
        // 1. Manual Assign
        document.getElementById('manual-assign-btn').onclick = function() {
            saveState();
            const absent = document.getElementById('absent-teacher').value;
            const sub = document.getElementById('manual-sub').value;
            const targetClass = document.getElementById('class-section').value;
            
            // Find cell based on text match (rough)
            const rows = document.querySelectorAll('#teacher-schedule tbody tr');
            let found = false;
            rows.forEach(tr => {
                if (tr.cells[0].textContent === absent) {
                    for(let i=1; i<tr.cells.length; i++) {
                        if (tr.cells[i].textContent.includes(targetClass) || tr.cells[i].textContent !== "Free") {
                            // Assign to first non-free slot found or match
                             tr.cells[i].textContent = sub;
                             tr.cells[i].style.color = '#38bdf8';
                             found = true;
                             break; // One at a time
                        }
                    }
                }
            });
            if(!found) alert("No matching class found to swap.");
        };

        // 2. Undo
        document.getElementById('undo-btn').onclick = () => {
            if (historyStack.length > 0) document.querySelector('#teacher-schedule tbody').innerHTML = historyStack.pop();
        };

        // 3. Reset
        document.getElementById('reset-btn').onclick = () => {
            if (confirm("Reset Table?")) {
                saveState();
                document.querySelector('#teacher-schedule tbody').innerHTML = initialHTML;
                document.getElementById('resultsContainer').innerHTML = '';
            }
        };

        // 4. Edit Mode
        document.getElementById('toggle-edit-btn').onclick = function() {
            const cells = document.querySelectorAll('.schedule-cell');
            const isEd = cells[0].contentEditable === "true";
            cells.forEach(c => {
                c.contentEditable = !isEd;
                c.style.border = !isEd ? "1px dashed #475569" : "1px solid #1e293b";
            });
            this.textContent = isEd ? "✏️ Edit Mode" : "💾 Save Edits";
        };

        // 5. Import Excel
        const fileInput = document.getElementById('file-input');
        document.getElementById('import-excel-btn').onclick = () => fileInput.click();
        
        fileInput.addEventListener('change', (e) => {
            saveState();
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                const workbook = XLSX.read(new Uint8Array(event.target.result), { type: 'array' });
                const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
                const tbody = document.querySelector('#teacher-schedule tbody');
                tbody.innerHTML = '';
                // Rebuild table from Excel
                rows.slice(1).forEach((rowData) => {
                    const tr = document.createElement('tr');
                    const tName = rowData[0] || "Unknown";
                    let html = `<td style="padding:12px; border-bottom:1px solid #1e293b; color:white;">${tName}</td>`;
                    for (let p = 1; p <= 9; p++) {
                        let content = rowData[p] || "Free";
                        let color = content === "Free" ? "#475569" : "#cbd5e1";
                        html += `<td id="${tName}-p${p}" class="schedule-cell" style="padding:12px; border-bottom:1px solid #1e293b; color:${color};">${content}</td>`;
                    }
                    tr.innerHTML = html;
                    tbody.appendChild(tr);
                });
                alert("Excel Imported Successfully.");
            };
            reader.readAsArrayBuffer(file);
        });

    }, 50);
}
class SubstitutionManager {
    constructor(note) {
        this.note = note;
        this.alertBox = substitutionModal;
        this.aiSuggestion = document.getElementById('ai-suggestion');
        this.activityLog = document.getElementById('activity-log');
        this.table = document.getElementById('teacher-schedule');
        this.editMode = false;
        this.undoStack = [];
        this.voiceActive = false;
                this.voiceEntryActive = false;
                this.qrScanningActive = false;
                this.video = document.getElementById('qr-video');
                this.isModalFullscreen = false;
                this.originalSchedule = {
                    "1A": { "period1": "Teacher 1", "period2": "Teacher 2", "fruit-lunch": "Teacher 3",
                            "period3": "Teacher 4", "period4": "Teacher 5", "regular-lunch": "Teacher 6",
                            "period5": "Teacher 7", "period6": "Teacher 8", "period7": "Teacher 9",
                            "period8": "Teacher 10", "period9": "Teacher 11" },
                    "1B": { "period1": "Teacher 12", "period2": "Teacher 13", "fruit-lunch": "Teacher 14",
                            "period3": "Teacher 15", "period4": "Teacher 16", "regular-lunch": "Teacher 17",
                            "period5": "Teacher 18", "period6": "Teacher 19", "period7": "Teacher 20",
                            "period8": "Teacher 21", "period9": "Teacher 22" },
                    "1C": { "period1": "Teacher 23", "period2": "Teacher 24", "fruit-lunch": "Teacher 25",
                            "period3": "Teacher 26", "period4": "Teacher 27", "regular-lunch": "Teacher 28",
                            "period5": "Teacher 29", "period6": "Teacher 30", "period7": "Teacher 31",
                            "period8": "Teacher 32", "period9": "Teacher 33" },
                    "1D": { "period1": "Teacher 34", "period2": "Teacher 35", "fruit-lunch": "Teacher 1",
                            "period3": "Teacher 2", "period4": "Teacher 3", "regular-lunch": "Teacher 4",
                            "period5": "Teacher 5", "period6": "Teacher 6", "period7": "Teacher 7",
                            "period8": "Teacher 8", "period9": "Teacher 9" }
                };
                this.teacherSubstituteCount = Object.fromEntries(Array.from({ length: 35 }, (_, i) => [`Teacher ${i + 1}`, 0]));
                this.teacherProfiles = Object.fromEntries(Array.from({ length: 35 }, (_, i) => [`Teacher ${i + 1}`, {
                    subjects: ["Math", "Science", "English", "History"][i % 4],
                    experience: Math.floor(Math.random() * 5) + 1,
                    preference: 0
                }]));
                this.classRequirements = {
                    "1A": ["Math", "Science"],
                    "1B": ["English", "History"],
                    "1C": ["Math", "English"],
                    "1D": ["Science", "History"]
                };
                this.assignmentHistory = JSON.parse(localStorage.getItem('assignmentHistory')) || {};
                this.debounceSave = this.debounce(() => this.saveTableState(), 500);
                this.initializeTable(note.scheduleData);
                this.bindEvents();
                this.updateButtonStates();
            }

            debounce(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            }

            getTableStructure() {
                const sections = [];
                const periods = [];
                const rows = this.table.rows;
                const headerRow = rows[0];

                for (let i = 1; i < headerRow.cells.length; i++) {
                    const periodId = headerRow.cells[i].id.replace('header-', '');
                    periods.push(periodId);
                }

                for (let i = 1; i < rows.length; i++) {
                    const sectionId = rows[i].id;
                    sections.push(sectionId);
                }

                return { sections, periods };
            }

            initializeTable(scheduleData) {
                if (scheduleData) {
                    this.table.outerHTML = scheduleData;
                    this.table = document.getElementById('teacher-schedule');
                } else {
                    this.resetSchedule(true);
                }
                this.restoreEventListeners();
                this.pushUndoState();
            }

            log(message) {
                const entry = document.createElement('div');
                entry.className = 'log-entry';
                entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
                this.activityLog.appendChild(entry);
                this.activityLog.scrollTop = this.activityLog.scrollHeight;
            }

            showModal(message) {
                alert(message);
            }

            pushUndoState() {
                this.undoStack.push({
                    tableHTML: this.table.outerHTML,
                    editMode: this.editMode,
                    teacherSubstituteCount: { ...this.teacherSubstituteCount }
                });
                if (this.undoStack.length > 20) this.undoStack.shift();
                this.updateButtonStates();
            }

            undo() {
                if (this.undoStack.length <= 1) {
                    this.showModal("Nothing to undo.");
                    this.log("Undo attempted: No previous state available");
                    return;
                }
                this.undoStack.pop();
                const previousState = this.undoStack[this.undoStack.length - 1];
                this.table.outerHTML = previousState.tableHTML;
                this.table = document.getElementById('teacher-schedule');
                this.editMode = previousState.editMode;
                this.teacherSubstituteCount = { ...previousState.teacherSubstituteCount };
                this.restoreEventListeners();
                document.getElementById('toggle-edit-btn').textContent = this.editMode ? "Disable Edit Mode" : "Toggle Edit Mode";
                this.log("Undo: Reverted to previous state");
                this.updateButtonStates();
                this.debounceSave();
            }

            calculateTeacherScore(teacher, absentTeacher, section, period) {
                const profile = this.teacherProfiles[teacher] || { subjects: [], experience: 0, preference: 0 };
                const classReqs = this.classRequirements[section] || ["Math", "Science", "English", "History"];
                const history = this.assignmentHistory[teacher] || { count: 0, successRate: 1 };

                let score = 0;
                const subjectMatch = classReqs.length === 0 || classReqs.some(req => profile.subjects.includes(req)) ? 40 : 0;
                score += subjectMatch;
                score += Math.min(profile.experience * 4, 20);
                const workload = this.teacherSubstituteCount[teacher] / 3;
                score += (1 - workload) * 20;
                score += history.successRate * 15;
                score += profile.preference * 5;

                let isAvailable = true;
                const { periods } = this.getTableStructure();
                periods.forEach(p => {
                    const cell = document.getElementById(`${section}-${p}`);
                    if (cell && cell !== document.getElementById(`${section}-${period}`) && cell.textContent === teacher) {
                        isAvailable = false;
                    }
                });
                return isAvailable && teacher !== absentTeacher ? score : -1;
            }

            predictFutureAvailability(teacher, section, periodIndex, periods) {
                let conflicts = 0;
                for (let i = periodIndex + 1; i < periods.length; i++) {
                    const futureCell = document.getElementById(`${section}-${periods[i]}`);
                    if (futureCell && futureCell.textContent === teacher) conflicts++;
                }
                return conflicts < 2;
            }

            updateAssignmentHistory(teacher, success) {
                if (!teacher) return;
                const history = this.assignmentHistory[teacher] || { count: 0, successRate: 1 };
                history.count++;
                history.successRate = (history.successRate * (history.count - 1) + (success ? 1 : 0)) / history.count;
                this.assignmentHistory[teacher] = history;
                localStorage.setItem('assignmentHistory', JSON.stringify(this.assignmentHistory));
            }

async getAISubstitute(absentTeacher, section, period, periods) {
                this.log(`Connecting to Python Brain for ${absentTeacher}...`);

                // 1. Gather Constraints: Find who is already teaching right now
                let busyTeachers = [];
                const { sections } = this.getTableStructure();
                
                // Scan the HTML table for teachers busy in other sections
                sections.forEach(sec => {
                    if (sec !== section) { 
                        const cell = document.getElementById(`${sec}-${period}`);
                        if (cell && cell.textContent.trim() !== "") {
                            busyTeachers.push(cell.textContent.trim());
                        }
                    }
                });

                try {
                    // 2. The Bridge: Send everything to Python (app.py)
                    const response = await fetch('/api/get-substitute', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            absent_teacher: absentTeacher, 
                            section: section, 
                            period: period,
                            busy_teachers: busyTeachers
                        }),
                    });

                    // 3. Receive the Smart Answer
                    const data = await response.json();
                    
                    if (data.status === "success") {
                        this.log(`Python selected: ${data.substitute}`);
                        this.log(`Reasoning: ${data.reason}`); // Shows the "Why" logic
                        return data.substitute;
                    } else {
                        this.log("Python says: No suitable teacher available.");
                        return null;
                    }

                } catch (error) {
                    console.error("Server connection failed:", error);
                    this.log("Error: Could not connect to Python backend.");
                    return null;
                }
            }

async aiAssignSubstitutes() {
                this.pushUndoState();
                const btn = document.getElementById('ai-assign-btn');
                btn.disabled = true;

                try {
                    // 1. Get the Teacher you are marking Absent
                    const absentInput = document.getElementById('absent-teacher').value;
                    if (!absentInput) { alert("Please select the absent teacher."); return; }

                    const targetName = absentInput.trim().toLowerCase();
                    const allCells = document.querySelectorAll('#teacher-schedule tbody td:not(:first-child)');
                    
                    let assignments = [];
                    let foundCount = 0;

                    this.log(`🔍 Processing absence for: "${absentInput}"...`);

                    // 2. Scan every cell to see if this teacher is currently there
                    for (const cell of allCells) {
                        const currentTeacherInCell = cell.textContent.trim();
                        
                        // MATCH FOUND: The absent teacher is in this cell
                        if (currentTeacherInCell.toLowerCase() === targetName && currentTeacherInCell.length > 0) {
                            foundCount++;

                            // --- THE CRITICAL "MEMORY" CHECK ---
                            // Check if there is a hidden "Original Owner" saved on this cell
                            let originalOwner = cell.dataset.original;

                            if (originalOwner) {
                                // CASE A: CHAIN REACTION
                                // The cell has a memory. That means the current teacher was just a sub.
                                // We ignore the current sub and use the memory (Original Owner).
                                this.log(`[Chain] ${currentTeacherInCell} is absent. Reverting to original owner: ${originalOwner}`);
                            } else {
                                // CASE B: FIRST TIME
                                // No memory exists. This means the current teacher IS the original owner.
                                // We save them into memory now, so we never forget them.
                                originalOwner = currentTeacherInCell;
                                cell.dataset.original = originalOwner; 
                                this.log(`[Lock] Locked ${originalOwner} as the permanent owner of this slot.`);
                            }

                            // 3. SEND THE *ORIGINAL OWNER* TO PYTHON
                            // We ask Python to find a sub for the Original Owner (e.g., Math), NOT the current sub.
                            const parts = cell.id.split('-'); 
                            const section = parts[0]; 
                            const period = parts.slice(1).join('-');
                            const { periods } = this.getTableStructure();

                            const newSub = await this.getAISubstitute(originalOwner, section, period, periods);

                            if (newSub) {
                                // 4. UPDATE THE CELL
                                cell.textContent = newSub; // Update text to new teacher
                                // cell.dataset.original stays as "Teacher 1" (Invisible Memory)
                                
                                cell.classList.add("highlight");
                                cell.classList.remove("conflict");
                                
                                if (!this.teacherSubstituteCount[newSub]) this.teacherSubstituteCount[newSub] = 0;
                                this.teacherSubstituteCount[newSub]++;

                                assignments.push(`${newSub} replaces ${currentTeacherInCell} (Class: ${originalOwner})`);
                                this.updateAssignmentHistory(newSub, true);
                            } else {
                                cell.classList.add("conflict");
                            }
                        }
                    }

                    // 5. Done
                    if (assignments.length > 0) {
                        this.showModal(`Substitution Update:\n${assignments.join("\n")}`);
                        this.debounceSave();
                    } else {
                        if (foundCount === 0) {
                            alert(`Teacher "${absentInput}" was not found in the table.`);
                        } else {
                            alert(`Found ${foundCount} classes, but AI could not find any available substitutes.`);
                        }
                    }

                } catch (error) {
                    console.error(error);
                    alert(`Error: ${error.message}`);
                } finally {
                    btn.disabled = false;
                    this.updateButtonStates();
                }
            }
            async uploadTimetable(event) {
                this.pushUndoState();
                const file = event.target.files[0];
                if (!file) return;

                const fileType = file.name.split('.').pop().toLowerCase();
                this.log(`Uploading timetable file: ${file.name} (${fileType})`);

                try {
                    if (fileType === 'xlsx' || fileType === 'xls') {
                        await this.parseExcel(file);
                    } else if (fileType === 'csv') {
                        await this.parseCSV(file);
                    } else if (fileType === 'pdf') {
                        await this.parsePDF(file);
                    }
                    this.restoreEventListeners();
                    this.debounceSave();
                } catch (error) {
                    this.showModal(`Error uploading timetable: ${error.message}`);
                    this.log(`Upload error: ${error.message}`);
                }
            }

            async parseExcel(file) {
                const reader = new FileReader();
                return new Promise((resolve, reject) => {
                    reader.onload = (e) => {
                        try {
                            const data = new Uint8Array(e.target.result);
                            const workbook = XLSX.read(data, { type: 'array' });
                            const sheet = workbook.Sheets[workbook.SheetNames[0]];
                            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                            this.processTimetableData(json);
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    };
                    reader.onerror = () => reject(new Error('Error reading file'));
                    reader.readAsArrayBuffer(file);
                });
            }

            async parseCSV(file) {
                const reader = new FileReader();
                return new Promise((resolve, reject) => {
                    reader.onload = (e) => {
                        try {
                            const text = e.target.result;
                            const rows = text.split('\n').map(row => row.split(','));
                            this.processTimetableData(rows);
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    };
                    reader.onerror = () => reject(new Error('Error reading file'));
                    reader.readAsText(file);
                });
            }

            async parsePDF(file) {
                const reader = new FileReader();
                return new Promise((resolve, reject) => {
                    reader.onload = async (e) => {
                        try {
                            const typedArray = new Uint8Array(e.target.result);
                            const pdf = await pdfjsLib.getDocument(typedArray).promise;
                            let text = '';
                            for (let i = 1; i <= pdf.numPages; i++) {
                                const page = await pdf.getPage(i);
                                const content = await page.getTextContent();
                                text += content.items.map(item => item.str).join(' ') + '\n';
                            }
                            const rows = text.split('\n').map(row => row.split(/\s+/));
                            this.processTimetableData(rows);
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    };
                    reader.onerror = () => reject(new Error('Error reading file'));
                    reader.readAsArrayBuffer(file);
                });
            }

processTimetableData(data) {
                const periods = ["period1", "period2", "fruit-lunch", "period3", "period4", 
                                "regular-lunch", "period5", "period6", "period7", "period8", "period9"];
                const tbody = this.table.querySelector('tbody');
                tbody.innerHTML = '';
                
                // CRITICAL: Reset the Memory of the Original Schedule on new load
                this.originalSchedule = {}; 

                let sectionIndex = -1;
                data.forEach((row, rowIndex) => {
                    // Regex check to identify class rows from Excel/CSV data
                    if (row.length > 1 && row[0].match(/Class \d+ - [A-D]/i)) {
                        sectionIndex++;
                        const sectionId = ["1A", "1B", "1C", "1D"][sectionIndex] || `New${sectionIndex}_${Date.now()}`;
                        
                        // Initialize memory storage for this specific section
                        this.originalSchedule[sectionId] = {};
                        
                        const newRow = tbody.insertRow(-1);
                        newRow.id = sectionId;

                        row.forEach((cell, colIndex) => {
                            const newCell = newRow.insertCell(-1);
                            const periodName = colIndex === 0 ? "class" : periods[colIndex - 1];
                            const cellValue = cell || '';
                            
                            newCell.id = `${sectionId}-${periodName || `period${colIndex}`}`;
                            newCell.textContent = cellValue;
                            
                            // LOGIC UPDATE: Save the initial teacher to memory
                            if (colIndex > 0 && periodName) {
                                this.originalSchedule[sectionId][periodName] = cellValue;
                                // Double-link via data attribute for redundancy/safety
                                newCell.dataset.original = cellValue;
                            }

                            newCell.contentEditable = this.editMode ? "true" : "false";
                            newCell.onclick = () => this.selectCell(newCell);
                            if (this.editMode && colIndex !== 0) newCell.classList.add("editable");
                        });
                    }
                });
                this.log("System Status: Timetable processed. Original Schedule memory initialized.");
            }

            assignSubstitute(absentTeacher = null, substituteTeacher = null, classSection = null, period = null) {
                this.pushUndoState();
                absentTeacher = absentTeacher || document.getElementById('absent-teacher').value;
                substituteTeacher = substituteTeacher || document.getElementById('substitute-teacher').value;
                classSection = classSection || document.getElementById('class-section').value;

                const { sections, periods } = this.getTableStructure();
                let assignments = [];

                if (period) {
                    if (sections.includes(classSection)) {
                        const cell = document.getElementById(`${classSection}-${period}`);
                        if (cell && cell.textContent === absentTeacher) {
                            let conflict = false;
                            sections.forEach(section => {
                                const otherCell = document.getElementById(`${section}-${period}`);
                                if (otherCell && otherCell !== cell && otherCell.textContent === substituteTeacher) {
                                    conflict = true;
                                    otherCell.classList.add('conflict');
                                    cell.classList.add('conflict');
                                }
                            });
                            if (!conflict) {
                                cell.textContent = substituteTeacher;
                                cell.classList.add("highlight");
                                assignments.push(period);
                                this.teacherSubstituteCount[substituteTeacher]++;
                                this.log(`Assignment: ${substituteTeacher} to ${classSection} (${period})`);
                            } else {
                                this.log(`Conflict detected for ${substituteTeacher} in ${period}`);
                                this.showModal(`Conflict: ${substituteTeacher} is already assigned in another section for ${period}.`);
                            }
                        }
                    }
                } else {
                    sections.forEach(section => {
                        if (section === classSection) {
                            periods.forEach(p => {
                                const cell = document.getElementById(`${section}-${p}`);
                                if (cell && cell.textContent === absentTeacher) {
                                    let conflict = false;
                                    sections.forEach(otherSection => {
                                        const otherCell = document.getElementById(`${otherSection}-${p}`);
                                        if (otherCell && otherCell !== cell && otherCell.textContent === substituteTeacher) {
                                            conflict = true;
                                            otherCell.classList.add('conflict');
                                            cell.classList.add('conflict');
                                        }
                                    });
                                    if (!conflict) {
                                        cell.textContent = substituteTeacher;
                                        cell.classList.add("highlight");
                                        assignments.push(p);
                                        this.teacherSubstituteCount[substituteTeacher]++;
                                        this.log(`Assignment: ${substituteTeacher} to ${section} (${p})`);
                                    } else {
                                        this.log(`Conflict detected for ${substituteTeacher} in ${p}`);
                                        this.showModal(`Conflict: ${substituteTeacher} is already assigned in another section for ${p}.`);
                                    }
                                }
                            });
                        }
                    });
                }

                if (assignments.length > 0) {
                    this.showModal(`Assigned ${substituteTeacher} to ${classSection} for ${assignments.join(", ")}.`);
                    this.debounceSave();
                } else {
                    this.showModal("No substitutions made. Check teacher and section.");
                    this.log(`No assignments made for ${substituteTeacher} in ${classSection}`);
                }
            }

            resetSchedule(initial = false) {
                if (!initial) this.pushUndoState();
                const { sections, periods } = this.getTableStructure();
                sections.forEach(section => {
                    periods.forEach(period => {
                        const cell = document.getElementById(`${section}-${period}`);
                        if (cell && this.originalSchedule[section] && this.originalSchedule[section][period]) {
                            cell.textContent = this.originalSchedule[section][period];
                            cell.classList.remove("highlight", "selected", "editable", "conflict");
                            cell.contentEditable = "false";
                        }
                    });
                });
                Object.keys(this.teacherSubstituteCount).forEach(teacher => {
                    this.teacherSubstituteCount[teacher] = 0;
                });
                this.editMode = false;
                document.getElementById('toggle-edit-btn').textContent = "Toggle Edit Mode";
                this.restoreEventListeners();
                if (!initial) {
                    this.log("Schedule reset to original state");
                    this.debounceSave();
                }
            }

            printSchedule() {
                window.print();
                this.log("Schedule printed");
            }

            async updateAISuggestion() {
                const absentTeacher = document.getElementById('absent-teacher').value;
                const { periods } = this.getTableStructure();
                const suggestedTeacher = await this.getAISubstitute(absentTeacher, "1A", periods[0], periods);
                this.aiSuggestion.textContent = suggestedTeacher 
                    ? `AI Suggestion: ${suggestedTeacher}` 
                    : "AI Suggestion: No suitable substitute available.";
            }

            toggleEditMode() {
                this.pushUndoState();
                this.editMode = !this.editMode;
                const cells = document.querySelectorAll("#teacher-schedule td");
                cells.forEach(cell => {
                    cell.contentEditable = this.editMode ? "true" : "false";
                    cell.classList.toggle("editable", this.editMode);
                    if (!this.editMode) cell.classList.remove("selected");
                });
                document.getElementById('toggle-edit-btn').textContent = this.editMode ? "Disable Edit Mode" : "Toggle Edit Mode";
                this.debounceSave();
            }

            addRow() {
                if (!this.editMode) return;
                this.pushUndoState();
                const table = this.table;
                const newRow = table.insertRow(-1);
                const cols = table.rows[0].cells.length;
                const newSectionId = `New${table.rows.length - 1}_${Date.now()}`;
                newRow.id = newSectionId;
                for (let i = 0; i < cols; i++) {
                    const newCell = newRow.insertCell(-1);
                    newCell.textContent = i === 0 ? `New Class ${table.rows.length - 1}` : "Edit";
                    newCell.id = `${newSectionId}-${table.rows[0].cells[i].id.replace('header-', '') || `period${i}`}`;
                    newCell.contentEditable = "true";
                    newCell.onclick = () => this.selectCell(newCell);
                    newCell.classList.add("editable");
                }
                this.debounceSave();
            }

            addColumn() {
                if (!this.editMode) return;
                this.pushUndoState();
                const table = this.table;
                const rows = table.rows;
                const newPeriodNum = rows[0].cells.length - 5;
                for (let i = 0; i < rows.length; i++) {
                    const newCell = rows[i].insertCell(-1);
                    newCell.textContent = i === 0 ? `Period ${newPeriodNum}` : "Edit";
                    newCell.id = i === 0 ? `header-period${newPeriodNum}` : `${rows[i].id}-period${newPeriodNum}`;
                    newCell.contentEditable = i !== 0 ? "true" : "false";
                    newCell.onclick = () => this.selectCell(newCell);
                    if (i !== 0) newCell.classList.add("editable");
                }
                this.debounceSave();
            }

            selectCell(cell) {
                if (cell.tagName !== "TH" && this.editMode) {
                    cell.classList.toggle("selected");
                    this.updateButtonStates();
                }
            }

            deleteSelectedCells() {
                if (!this.editMode) return;
                const selectedCells = document.querySelectorAll(".selected");
                if (selectedCells.length === 0) return;
                this.pushUndoState();
                selectedCells.forEach(cell => {
                    cell.textContent = "";
                    cell.classList.remove("selected");
                });
                this.debounceSave();
            }

            deleteSelectedRows() {
                if (!this.editMode) return;
                const table = this.table;
                const selectedRows = Array.from(document.querySelectorAll(".selected"))
                    .map(cell => cell.parentElement.rowIndex)
                    .filter((value, index, self) => self.indexOf(value) === index && value > 0)
                    .sort((a, b) => b - a);
                if (selectedRows.length === 0) return;
                this.pushUndoState();
                selectedRows.forEach(rowIndex => {
                    if (table.rows.length > 2) table.deleteRow(rowIndex);
                });
                this.debounceSave();
            }

            deleteSelectedColumns() {
                if (!this.editMode) return;
                const table = this.table;
                const selectedColumns = Array.from(document.querySelectorAll(".selected"))
                    .map(cell => cell.cellIndex)
                    .filter((value, index, self) => self.indexOf(value) === index)
                    .sort((a, b) => b - a);
                if (selectedColumns.length === 0) return;
                this.pushUndoState();
                selectedColumns.forEach(colIndex => {
                    if (table.rows[0].cells.length > 1) {
                        for (let i = 0; i < table.rows.length; i++) {
                            if (table.rows[i].cells.length > colIndex) {
                                table.rows[i].deleteCell(colIndex);
                            }
                        }
                    }
                });
                this.debounceSave();
            }

            saveTableState() {
                try {
                    const success = updateNote(this.note.id, this.table.outerHTML);
                    if (success) {
                        this.log("Table state saved successfully");
                    } else {
                        this.showModal("Error: Note not found");
                        this.log("Save error: Note not found");
                    }
                } catch (error) {
                    this.showModal(`Error saving table state: ${error.message}`);
                    this.log(`Save error: ${error.message}`);
                }
            }

            restoreEventListeners() {
                document.querySelectorAll("#teacher-schedule td, #teacher-schedule th").forEach(cell => {
                    cell.onclick = () => this.selectCell(cell);
                    if (cell.tagName !== "TH") {
                        cell.contentEditable = this.editMode ? "true" : "false";
                        if (this.editMode) cell.classList.add("editable");
                        else cell.classList.remove("editable", "selected");
                        cell.addEventListener('input', () => {
                            if (this.editMode) {
                                this.pushUndoState();
                                this.debounceSave();
                                this.log(`Cell edited: ${cell.id} changed to "${cell.textContent}"`);
                            }
                        });
                    }
                });
            }

            importFromExcel() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.xlsx,.xls';
                input.onchange = (e) => this.handleExcelImport(e);
                input.click();
            }

            handleExcelImport(event) {
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const workbook = XLSX.read(e.target.result, { type: 'array' });
                        const sheetName = workbook.SheetNames[0];
                        const sheet = workbook.Sheets[sheetName];
                        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: true });
                        const hasHeader = confirm("Does the Excel file include a header row?");
                        const excelRows = hasHeader ? data.slice(1) : data;
                        const excelCols = data[0] ? data[0].length : 0;
                        let currentCols = this.table.rows[0].cells.length;
                        while (excelCols > currentCols) {
                            this.addColumn();
                            currentCols++;
                        }
                        const rows = this.table.rows;
                        const headerRow = rows[0];
                        if (hasHeader) {
                            for (let j = 0; j < excelCols; j++) {
                                const newText = data[0][j] || headerRow.cells[j].textContent;
                                headerRow.cells[j].textContent = newText;
                                if (j >= 1) {
                                    let newPeriodId = newText.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                                    if (!newPeriodId) newPeriodId = `period${j}`;
                                    headerRow.cells[j].id = `header-${newPeriodId}`;
                                    for (let k = 1; k < rows.length; k++) {
                                        rows[k].cells[j].id = `${rows[k].id}-${newPeriodId}`;
                                    }
                                }
                            }
                        }
                        let currentRows = this.table.rows.length - 1;
                        while (excelRows.length > currentRows) {
                            this.addRow();
                            currentRows++;
                        }
                        for (let i = 1; i < this.table.rows.length; i++) {
                            const row = this.table.rows[i];
                            for (let j = 0; j < row.cells.length; j++) {
                                const excelVal = (excelRows[i - 1] && excelRows[i - 1][j] !== undefined) ? excelRows[i - 1][j] : '';
                                row.cells[j].textContent = excelVal;
                            }
                        }
                        this.restoreEventListeners();
                        this.debounceSave();
                        this.log("Imported data from Excel");
                    } catch (error) {
                        this.showModal(`Error reading Excel file: ${error.message}`);
                        this.log(`Excel import error: ${error.message}`);
                    }
                };
                reader.readAsArrayBuffer(file);
            }

            bindEvents() {
                document.getElementById('manual-assign-btn').onclick = () => this.assignSubstitute();
                document.getElementById('ai-assign-btn').onclick = () => this.aiAssignSubstitutes();
                document.getElementById('reset-btn').onclick = () => this.resetSchedule();
                document.getElementById('print-btn').onclick = () => this.printSchedule();
                document.getElementById('toggle-edit-btn').onclick = () => this.toggleEditMode();
                document.getElementById('add-row-btn').onclick = () => this.addRow();
                document.getElementById('add-column-btn').onclick = () => this.addColumn();
                document.getElementById('delete-cells-btn').onclick = () => this.deleteSelectedCells();
                document.getElementById('delete-rows-btn').onclick = () => this.deleteSelectedRows();
                document.getElementById('delete-columns-btn').onclick = () => this.deleteSelectedColumns();
                document.getElementById('voice-btn').onclick = () => this.toggleVoiceCommands();
                document.getElementById('undo-btn').onclick = () => this.undo();
                document.getElementById('voice-entry-btn').onclick = () => this.toggleVoiceEntry();
                document.getElementById('qr-scan-btn').onclick = () => this.toggleQRScan();
                document.getElementById('absent-teacher').addEventListener('change', () => this.updateAISuggestion());
                document.getElementById('timetable-upload').addEventListener('change', (e) => this.uploadTimetable(e));
                document.getElementById('ocr-upload').addEventListener('change', (e) => this.processOCRUpload(e));
                document.getElementById('modal-fullscreen-btn').onclick = () => this.toggleModalFullscreen();
                document.getElementById('import-excel-btn').onclick = () => this.importFromExcel();
                document.addEventListener('fullscreenchange', () => {
                    this.isModalFullscreen = document.fullscreenElement === document.querySelector('.modal-content');
                    document.getElementById('modal-fullscreen-btn').textContent = this.isModalFullscreen ? '🗗' : '⛶';
                    document.getElementById('modal-fullscreen-btn').title = this.isModalFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen';
                });
                document.addEventListener("keydown", (event) => {
                    const modifier = event.ctrlKey || event.metaKey;
                    if (modifier) {
                        switch (event.key) {
                            case "e": case "E": this.toggleEditMode(); event.preventDefault(); break;
                            case "z": case "Z": this.undo(); event.preventDefault(); break;
                        }
                    }
                });
                this.setupVoiceCommands();
                this.setupVoiceEntry();
                this.setupQRScanner();
            }

            updateButtonStates() {
                const hasSelected = !!document.querySelector(".selected");
                document.getElementById('add-row-btn').disabled = !this.editMode;
                document.getElementById('add-column-btn').disabled = !this.editMode;
                document.getElementById('delete-cells-btn').disabled = !this.editMode || !hasSelected;
                document.getElementById('delete-rows-btn').disabled = !this.editMode || !hasSelected || this.table.rows.length <= 2;
                document.getElementById('delete-columns-btn').disabled = !this.editMode || !hasSelected || this.table.rows[0].cells.length <= 1;
                document.getElementById('undo-btn').disabled = this.undoStack.length <= 1;
            }

 // ✅ REPLACE YOUR OLD 'setupVoiceCommands' WITH THIS
// ✅ REPLACEMENT: Connects Microphone to Python
// ✅ PASTE THIS AT LINE ~1250 (Inside the Class)
            setupVoiceCommands() {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) {
                    alert("⚠️ Voice not supported. Use Chrome.");
                    return;
                }
                this.recognition = new SpeechRecognition();
                this.recognition.continuous = false; // Stop after one command
                this.recognition.lang = 'en-US';

                // WHEN YOU SPEAK
                this.recognition.onresult = (event) => {
                    const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
                    
                    this.log(`🎤 Voice Input: "${transcript}"`);
                    
                    // CALL THE FUNCTION WE PUT AT THE BOTTOM
                    sendVoiceToBackend(transcript);
                    
                    // Stop listening visually
                    this.toggleVoiceCommands(); 
                };

                this.recognition.onerror = (event) => {
                    this.log(`⚠️ Voice error: ${event.error}`);
                    this.toggleVoiceCommands(); 
                };
            }

            toggleVoiceCommands() {
                if (!this.recognition) {
                    this.showModal("Voice commands not supported");
                    return;
                }
                if (this.voiceActive) {
                    this.recognition.stop();
                    this.voiceActive = false;
                } else {
                    this.recognition.start();
                    this.voiceActive = true;
                }
                document.getElementById('voice-btn').textContent = this.voiceActive ? "Stop Voice Commands" : "Start Voice Commands";
            }

            processVoiceCommand(command) {
                const commands = {
                    "toggle edit": () => this.toggleEditMode(),
                    "add row": () => this.addRow(),
                    "add column": () => this.addColumn(),
                    "delete selected cells": () => this.deleteSelectedCells(),
                    "delete row": () => this.deleteSelectedRows(),
                    "delete column": () => this.deleteSelectedColumns(),
                    "undo": () => this.undo()
                };
                const action = commands[command];
                if (action) {
                    action();
                } else {
                    this.log(`Unrecognized voice command: "${command}"`);
                }
            }

            setupVoiceEntry() {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) {
                    this.log("Voice entry not supported in this browser");
                    return;
                }
                this.entryRecognition = new SpeechRecognition();
                this.entryRecognition.continuous = true;
                this.entryRecognition.interimResults = false;
                this.entryRecognition.lang = 'en-US';

                this.entryRecognition.onresult = (event) => {
                    const transcript = event.results[event.results.length - 1][0].transcript.trim();
                    this.log(`Voice entry: "${transcript}"`);
                    this.processVoiceEntry(transcript);
                };
                this.entryRecognition.onerror = (event) => {
                    this.log(`Voice entry error: ${event.error}`);
                };
            }

            toggleVoiceEntry() {
                if (!this.entryRecognition) {
                    this.showModal("Voice entry not supported");
                    return;
                }
                if (this.voiceEntryActive) {
                    this.entryRecognition.stop();
                    this.voiceEntryActive = false;
                } else {
                    this.entryRecognition.start();
                    this.voiceEntryActive = true;
                }
                document.getElementById('voice-entry-btn').textContent = this.voiceEntryActive ? "Stop Voice Entry" : "Start Voice Entry";
            }

            processVoiceEntry(transcript) {
                const regex = /(?:Teacher\s+)(\d+)\s+is\s+absent\s+for\s+Class\s+(\d+[A-D])\s*,\s*(Period\s+\d+|Fruit\s+Lunch|Regular\s+Lunch)\s*\.\s*Assign\s+(?:Teacher\s+)(\d+)/i;
                const match = transcript.match(regex);
                if (match) {
                    const [, absentTeacher, classSection, periodText, substituteTeacher] = match;
                    const periodMap = {
                        "period 1": "period1", "period 2": "period2", "fruit lunch": "fruit-lunch",
                        "period 3": "period3", "period 4": "period4", "regular lunch": "regular-lunch",
                        "period 5": "period5", "period 6": "period6", "period 7": "period7",
                        "period 8": "period8", "period 9": "period9"
                    };
                    const period = periodMap[periodText.toLowerCase()];
                    if (period) {
                        this.assignSubstitute(`Teacher ${absentTeacher}`, `Teacher ${substituteTeacher}`, classSection, period);
                    } else {
                        this.log(`Invalid period in voice entry: ${periodText}`);
                    }
                } else {
                    this.log(`Invalid voice entry format: ${transcript}`);
                }
            }

            setupQRScanner() {
                this.canvas = document.createElement('canvas');
                this.context = this.canvas.getContext('2d');
            }

            toggleQRScan() {
                if (this.qrScanningActive) {
                    this.stopQRScan();
                } else {
                    this.startQRScan();
                }
            }

            async startQRScan() {
                try {
                    this.qrScanningActive = true;
                    this.video.style.display = 'block';
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                    this.video.srcObject = stream;
                    this.scanQRCode();
                } catch (error) {
                    this.showModal(`Error starting QR scanner: ${error.message}`);
                    this.log(`QR scanner error: ${error.message}`);
                }
            }

            stopQRScan() {
                if (this.video.srcObject) {
                    this.video.srcObject.getTracks().forEach(track => track.stop());
                    this.video.srcObject = null;
                }
                this.qrScanningActive = false;
                this.video.style.display = 'none';
            }

            scanQRCode() {
                const scan = () => {
                    if (!this.qrScanningActive) return;
                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;
                    this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
                    const code = jsQR(imageData.data, imageData.width, imageData.height);

                    if (code) {
                        this.processQRCode(code.data);
                        this.stopQRScan();
                    } else {
                        requestAnimationFrame(scan);
                    }
                };
                requestAnimationFrame(scan);
            }

            async processQRCode(data) {
                try {
                    const absentTeacher = data.trim();
                    document.getElementById('absent-teacher').value = absentTeacher;
                    const { periods } = this.getTableStructure();
                    const substitute = await this.getAISubstitute(absentTeacher, "1A", periods[0], periods);
                    if (substitute) {
                        document.getElementById('substitute-teacher').value = substitute;
                        this.log(`QR scan: Set absent teacher to ${absentTeacher}, suggested substitute ${substitute}`);
                    }
                } catch (error) {
                    this.showModal(`Error processing QR code: ${error.message}`);
                    this.log(`QR code processing error: ${error.message}`);
                }
            }

            async processOCRUpload(event) {
                this.pushUndoState();
                const file = event.target.files[0];
                if (!file) return;

                const fileType = file.name.split('.').pop().toLowerCase();
                try {
                    if (fileType === 'pdf') {
                        const text = await this.extractTextFromPDF(file);
                        this.processOCRText(text);
                    } else if (['jpg', 'jpeg', 'png'].includes(fileType)) {
                        const text = await this.extractTextFromImage(file);
                        this.processOCRText(text);
                    }
                    this.restoreEventListeners();
                    this.debounceSave();
                } catch (error) {
                    this.showModal(`Error processing OCR upload: ${error.message}`);
                    this.log(`OCR upload error: ${error.message}`);
                }
            }

            async extractTextFromImage(file) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        try {
                            const img = new Image();
                            img.onload = async () => {
                                const { data } = await Tesseract.recognize(img, 'eng');
                                resolve(data.text);
                            };
                            img.onerror = () => reject(new Error('Error loading image'));
                            img.src = e.target.result;
                        } catch (error) {
                            reject(error);
                        }
                    };
                    reader.onerror = () => reject(new Error('Error reading file'));
                    reader.readAsDataURL(file);
                });
            }

            async extractTextFromPDF(file) {
                const reader = new FileReader();
                return new Promise((resolve, reject) => {
                    reader.onload = async (e) => {
                        try {
                            const typedArray = new Uint8Array(e.target.result);
                            const pdf = await pdfjsLib.getDocument(typedArray).promise;
                            let text = '';
                            for (let i = 1; i <= pdf.numPages; i++) {
                                const page = await pdf.getPage(i);
                                const content = await page.getTextContent();
                                text += content.items.map(item => item.str).join(' ') + '\n';
                            }
                            resolve(text);
                        } catch (error) {
                            reject(error);
                        }
                    };
                    reader.onerror = () => reject(new Error('Error reading file'));
                    reader.readAsArrayBuffer(file);
                });
            }

            processOCRText(text) {
                this.pushUndoState();
                const lines = text.split('\n').filter(line => line.trim());
                const periodMap = {
                    "Period 1": "period1", "Period 2": "period2", "Fruit Lunch": "fruit-lunch",
                    "Period 3": "period3", "Period 4": "period4", "Regular Lunch": "regular-lunch",
                    "Period 5": "period5", "Period 6": "period6", "Period 7": "period7",
                    "Period 8": "period8", "Period 9": "period9"
                };
                let currentSection = null;
                lines.forEach(line => {
                    const classMatch = line.match(/Class\s+1\s+-\s+([A-D])/i);
                    if (classMatch) currentSection = `1${classMatch[1].toUpperCase()}`;
                    if (currentSection) {
                        const words = line.split(/\s+/);
                        let periodIdx = -1;
                        words.forEach((word, idx) => {
                            const periodMatch = word.match(/(Period\s+[1-9]|Fruit\s+Lunch|Regular\s+Lunch)/i) || 
                                (words.slice(idx, idx + 2).join(' ').match(/(Period\s+[1-9]|Fruit\s+Lunch|Regular\s+Lunch)/i));
                            if (periodMatch) {
                                const period = periodMap[periodMatch[0]];
                                if (period) periodIdx = Object.values(periodMap).indexOf(period);
                            } else if (periodIdx >= 0 && /Teacher\s+\d+/.test(word)) {
                                const cellId = `${currentSection}-${Object.values(periodMap)[periodIdx]}`;
                                const cell = document.getElementById(cellId);
                                if (cell) cell.textContent = word;
                            }
                        });
                    }
                });
            }

            toggleModalFullscreen() {
                const modalContent = document.querySelector('.modal-content');
                if (!this.isModalFullscreen) {
                    modalContent.requestFullscreen().then(() => {
                        this.isModalFullscreen = true;
                        this.log("Modal entered fullscreen mode");
                    }).catch(err => {
                        this.showModal(`Error entering fullscreen: ${err.message}`);
                        this.log(`Modal fullscreen error: ${err.message}`);
                    });
                } else {
                    document.exitFullscreen().then(() => {
                        this.isModalFullscreen = false;
                        this.log("Modal exited fullscreen mode");
                    }).catch(err => {
                        this.showModal(`Error exiting fullscreen: ${err.message}`);
                        this.log(`Modal fullscreen error: ${err.message}`);
                    });
                }
            }
        }

        function initializeSubstitutionManager(note) {
            const manager = new SubstitutionManager(note);
            const modalClose = substitutionModal.querySelector('.close');
            modalClose.onclick = () => {
                manager.saveTableState();
                substitutionModal.style.display = 'none';
                if (manager.qrScanningActive) manager.stopQRScan();
                if (manager.voiceActive) manager.toggleVoiceCommands();
                if (manager.voiceEntryActive) manager.toggleVoiceEntry();
            };
        }

        window.addEventListener('load', () => {
            loadFolders();
            loadNotes();
            const savedTheme = localStorage.getItem('theme') || 'dark';
            document.body.dataset.theme = savedTheme;
            themeSelect.value = savedTheme;
        });

        backBtn.addEventListener('click', () => {
            if (historyIndex > 0) {
                historyIndex--;
                alert(`Navigating back to: ${history[historyIndex]}`);
            }
        });

        forwardBtn.addEventListener('click', () => {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                alert(`Navigating forward to: ${history[historyIndex]}`);
            }
        });

        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('hidden');
        });

      // ✅ NEW COOL NOTE BUTTON
newFileBtn.addEventListener('click', async () => {
    // Uses 'nicePrompt' instead of 'prompt'
    const noteContent = await nicePrompt('Enter your note content:'); 
    
    if (noteContent) {
        const noteTitle = await nicePrompt('Enter a title for your note:');
        if (noteTitle) {
            const noteTimestamp = getFormattedTimestamp();
            const note = saveNote(noteContent, noteTitle, noteTimestamp, activeFolder);
            
            const newNote = document.createElement('div');
            newNote.classList.add('note-card');
            newNote.innerHTML = `
                <div class="note-content">${noteContent}</div>
                <div class="note-title">${noteTitle}</div>
                <div class="note-date">${noteTimestamp}</div>
            `;
            newNote.dataset.id = note.id;
            newNote.addEventListener('click', () => openSubstitutionForm(note));
            notesGrid.insertBefore(newNote, notesGrid.firstChild);
        }
    }
});

        copyBtn.addEventListener('click', () => {
            if (selectedNote) {
                const content = selectedNote.querySelector('.note-content').textContent;
                navigator.clipboard.writeText(content).then(() => alert('Note content copied!'));
            }
        });

// ✅ NEW COOL AUDIO BUTTON
audioBtn.addEventListener('click', async () => {
    const noteTitle = await nicePrompt('Enter a title for your audio note:');
    if (noteTitle) {
        const noteContent = '[Audio recording placeholder]';
        const noteTimestamp = getFormattedTimestamp();
        const note = saveNote(noteContent, noteTitle, noteTimestamp, activeFolder);
        
        const newNote = document.createElement('div');
        newNote.classList.add('note-card');
        newNote.innerHTML = `
            <div class="note-content">${noteContent}</div>
            <div class="note-title">${noteTitle}</div>
            <div class="note-date">${noteTimestamp}</div>
        `;
        newNote.dataset.id = note.id;
        newNote.addEventListener('click', () => openSubstitutionForm(note));
        notesGrid.insertBefore(newNote, notesGrid.firstChild);
    }
});

        viewToggleBtn.addEventListener('click', () => {
            isGridView = !isGridView;
            notesGrid.classList.toggle('notes-grid', isGridView);
            notesGrid.classList.toggle('notes-list', !isGridView);
        });




        fullscreenBtn.addEventListener('click', toggleFullscreen);

       

        newFolderBtn.addEventListener('click', () => {
            const folderName = prompt('Enter a name for your new folder:');
            if (folderName) {
                saveFolder(folderName);
                activeFolder = folderName;
                loadNotes(activeFolder);
            }
        });

        searchInput.addEventListener('input', () => {
            const query = searchInput.value;
            loadNotes(activeFolder, query);
        });

        settingsBtn.addEventListener('click', () => {
            settingsPanel.style.display = 'block';
        });

        settingsClose.onclick = () => {
            settingsPanel.style.display = 'none';
        };

        saveSettingsBtn.addEventListener('click', () => {
            const selectedTheme = themeSelect.value;
            document.body.dataset.theme = selectedTheme;
            localStorage.setItem('theme', selectedTheme);
            settingsPanel.style.display = 'none';
        });

        document.addEventListener('fullscreenchange', () => {
            const isAppFullscreen = !!document.fullscreenElement && document.fullscreenElement !== document.querySelector('.modal-content');
            if (isAppFullscreen) {
                isFullscreen = true;
                fullscreenBtn.textContent = '🗗';
                fullscreenBtn.title = 'Exit Fullscreen';
            } else if (!document.fullscreenElement) {
                isFullscreen = false;
                fullscreenBtn.textContent = '⛶';
                fullscreenBtn.title = 'Toggle Fullscreen';
            }
        });

	// <![CDATA[  <-- For SVG support
	if ('WebSocket' in window) {
		(function () {
			function refreshCSS() {
				var sheets = [].slice.call(document.getElementsByTagName("link"));
				var head = document.getElementsByTagName("head")[0];
				for (var i = 0; i < sheets.length; ++i) {
					var elem = sheets[i];
					var parent = elem.parentElement || head;
					parent.removeChild(elem);
					var rel = elem.rel;
					if (elem.href && typeof rel != "string" || rel.length == 0 || rel.toLowerCase() == "stylesheet") {
						var url = elem.href.replace(/(&|\?)_cacheOverride=\d+/, '');
						elem.href = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_cacheOverride=' + (new Date().valueOf());
					}
					parent.appendChild(elem);
				}
			}
			var protocol = window.location.protocol === 'http:' ? 'ws://' : 'wss://';
			var address = protocol + window.location.host + window.location.pathname + '/ws';
			var socket = new WebSocket(address);
			socket.onmessage = function (msg) {
				if (msg.data == 'reload') window.location.reload();
				else if (msg.data == 'refreshcss') refreshCSS();
			};
			if (sessionStorage && !sessionStorage.getItem('IsThisFirstTime_Log_From_LiveServer')) {
				console.log('Live reload enabled.');
				sessionStorage.setItem('IsThisFirstTime_Log_From_LiveServer', true);
			}
		})();
	}
	else {
		console.error('Upgrade your browser. This Browser is NOT supported WebSocket for Live-Reloading.');
	}
	// ]]>
    /* ============================
   CONTEXT MENUS + ANALYTICS
   ============================ */


/* ============================
   ANALYTICS (SAFE)
   ============================ */

let chartsRendered = false;

function openAnalytics() {
  document.getElementById("analyticsModule").classList.remove("hidden");

  if (chartsRendered) return;
  chartsRendered = true;

  const pieCtx = document.getElementById("pieChart");
  const barCtx = document.getElementById("barChart");
  const lineCtx = document.getElementById("lineChart");

  // PIE — Substitution load per teacher
  new Chart(pieCtx, {
    type: "pie",
    data: {
      labels: ["Mr. Sharma", "Ms. Gupta", "Mr. Khan", "Ms. Iyer"],
      datasets: [{
        data: [8, 6, 5, 5],
        backgroundColor: ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"]
      }]
    }
  });

  // BAR — Absences by department
  new Chart(barCtx, {
    type: "bar",
    data: {
      labels: ["Maths", "Science", "English", "CS"],
      datasets: [{
        label: "Absences",
        data: [4, 5, 2, 1],
        backgroundColor: "#3b82f6"
      }]
    }
  });

  // LINE — Daily substitution trend
  new Chart(lineCtx, {
    type: "line",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      datasets: [{
        label: "Substitutions",
        data: [3, 5, 4, 7, 6],
        borderColor: "#22c55e",
        tension: 0.4
      }]
    }
  });
}

document.getElementById("closeAnalytics").onclick = () => {
  document.getElementById("analyticsModule").classList.add("hidden");
};
/* ==========================================
   ACTIVATE NEW FOLDER BUTTON
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    const newFolderBtn = document.getElementById('new-folder-btn');
    
    if (newFolderBtn) {
        newFolderBtn.addEventListener('click', () => {
            // Ask user for the name
            const folderName = prompt("Enter new department/folder name:");
            
            // If they typed something, save it
            if (folderName) {
                saveFolder(folderName);
            }
        });
    }
});


// ✅ SMART VERSION: Sets the teacher, then clicks AI
function sendVoiceToBackend(text) {
    console.log("🎤 Sending to Python:", text);
    
    fetch('/voice_trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'spoken_text': text })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.teacher_id) {
            
            // 1. UPDATE THE DROPDOWN
            const absentSelect = document.getElementById("absent-teacher");
            if (absentSelect) {
                absentSelect.value = data.teacher_id;
                // Trigger 'change' event so any other logic knows it changed
                absentSelect.dispatchEvent(new Event('change'));
                console.log(`✅ Set Absent Teacher to: ${data.teacher_id}`);
            }

            // 2. SHOW STATUS
            const status = document.getElementById("voice-status");
            if(status) status.innerText = "✅ " + data.message;

            // 3. CLICK THE AI BUTTON
            setTimeout(() => {
                const aiBtn = document.getElementById("ai-assign-btn");
                if (aiBtn) {
                    console.log("🤖 Clicking AI Assign Button...");
                    aiBtn.click();
                }
            }, 500); // Small delay to let the dropdown update visually first

        } else {
            // Only alert if it failed badly
            console.warn(data.message);
        }
    });
}


// Call this function whenever you add/render notes
function attachShareListeners() {
    document.querySelectorAll('.note-item').forEach(el => {
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Extract text from the note element
            shareData.content = el.innerText || el.textContent;
            const titleEl = el.querySelector('h3') || el.querySelector('h2');
            shareData.title = titleEl ? titleEl.innerText : "Quick Note";

            shareMenu.style.display = 'block';
            shareMenu.style.left = `${e.pageX}px`;
            shareMenu.style.top = `${e.pageY}px`;
        });
    });
}

document.getElementById('btn-share-trigger').onclick = async () => {
    try {
        const res = await fetch('/api/share-note', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(shareData)
        });
        const data = await res.json();
        
        await navigator.clipboard.writeText(data.url);
        alert("Link Copied:\n" + data.url);
    } catch (err) {
        console.error(err);
        alert("Share failed.");
    }
};

// Start listener loop
setInterval(attachShareListeners, 1000);







// --- FINAL SECURE SHARE LOGIC (Targeting .note-card) ---

(function() {
    // 1. Create the Menu
    let shareMenu = document.getElementById('custom-share-menu');
    if (shareMenu) shareMenu.remove(); // Clean up old duplicates

    shareMenu = document.createElement('div');
    shareMenu.id = 'custom-share-menu';
    shareMenu.style.cssText = "display: none; position: absolute; z-index: 10000; background: #0f172a; border: 1px solid #38bdf8; padding: 10px; border-radius: 6px; box-shadow: 0 4px 15px black; cursor: pointer;";
    shareMenu.innerHTML = `<span style="color:#38bdf8; font-weight:bold; font-family:sans-serif;">🔗 Copy Secure Link</span>`;
    document.body.appendChild(shareMenu);

    let selectedNoteData = null;

    // 2. Hide Menu on Click Elsewhere
    document.addEventListener('click', () => shareMenu.style.display = 'none');

    // 3. Attach Right-Click Listener to Cards
    function enableRightClick() {
        // TARGET YOUR SPECIFIC CLASS: .note-card
        const cards = document.querySelectorAll('.note-card');

        cards.forEach(card => {
            if (card.dataset.hasShare === "true") return;
            card.dataset.hasShare = "true";

            card.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Stop default browser menu
                e.stopPropagation();

                // Get Content
                const contentEl = card.querySelector('.note-content');
                const titleEl = card.querySelector('.note-title');

                selectedNoteData = {
                    content: contentEl ? contentEl.innerText : card.innerText, 
                    title: titleEl ? titleEl.innerText : "Shared Note"
                };

                // Show Menu
                shareMenu.style.display = 'block';
                shareMenu.style.left = e.pageX + 'px';
                shareMenu.style.top = e.pageY + 'px';
            });
        });
    }

    // 4. Handle Button Click
    shareMenu.onclick = async () => {
        if (!selectedNoteData) return;
        
        // Visual Feedback
        shareMenu.innerHTML = `<span style="color:#fbbf24;">⏳ Generating...</span>`;

        try {
            const response = await fetch('/api/share-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedNoteData)
            });

            const data = await response.json();
            
            await navigator.clipboard.writeText(data.url);
            alert("✅ Link Copied!\n" + data.url);

        } catch (error) {
            console.error(error);
            alert("Error: Server not responding.");
        } finally {
            // Reset Text
            shareMenu.innerHTML = `<span style="color:#38bdf8; font-weight:bold; font-family:sans-serif;">🔗 Copy Secure Link</span>`;
            shareMenu.style.display = 'none';
        }
    };

    // 5. Run constantly to catch new notes
    setInterval(enableRightClick, 1000);

})();
// --- SHARE TABLE LOGIC ---

// 1. Function to Inject the Button
function addShareTableButton() {
    // Look for the action buttons area in your modal
    const actionsArea = document.querySelector('.hero-actions');
    
    // Prevent adding duplicates
    if (!actionsArea || document.getElementById('btn-share-table')) return;

    const btn = document.createElement('button');
    btn.id = 'btn-share-table';
    btn.className = 'hero-btn'; 
    btn.style.cssText = "background: #7c3aed; border: 1px solid #8b5cf6; color: white; border-radius: 12px; cursor: pointer; font-weight: 600; flex: 1;";
    btn.innerHTML = `<span class="icon">🔗</span> Share Table`;
    
    // Add click event
    btn.onclick = async () => {
        const table = document.getElementById('teacher-schedule');
        if (!table) { alert("Table not found!"); return; }

        btn.innerHTML = "⏳ Sending...";
        
        try {
            // Send the entire Table HTML
            const response = await fetch('/api/share-note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: "Master Schedule Snapshot",
                    content: table.outerHTML // <--- THIS SENDS THE TABLE
                })
            });

            const data = await response.json();
            await navigator.clipboard.writeText(data.url);
            alert("✅ Table Link Copied!\n" + data.url);

        } catch (err) {
            console.error(err);
            alert("Error sharing table.");
        } finally {
            btn.innerHTML = `<span class="icon">🔗</span> Share Table`;
        }
    };

    actionsArea.appendChild(btn);
}

// 2. Run check every second (in case modal closes/opens)
setInterval(addShareTableButton, 1000);

