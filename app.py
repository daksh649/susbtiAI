import os
import uuid
import datetime
import time
from flask import Flask, render_template, request, jsonify, render_template_string
from flask_sqlalchemy import SQLAlchemy

# --- 1. INITIALIZE APP & DATABASE CONFIGURATION ---
app = Flask(__name__)

# Get the database URL from the cloud (Render) or use a local file
database_url = os.environ.get('DATABASE_URL')

# Fix for Render's URL format (postgres:// -> postgresql://)
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

# Apply the configuration
app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the Database (DO THIS ONLY ONCE)
db = SQLAlchemy(app)

# --- 2. DATABASE MODELS (THE TABLES) ---

# Model 1: For Sharing Notes
class SharedContent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(100), unique=True, nullable=False)
    content = db.Column(db.Text, nullable=False)
    title = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# Model 2: The Master Log (History)
class MasterLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    action_type = db.Column(db.String(50), nullable=False)
    details = db.Column(db.Text, nullable=False)

    def to_dict(self):
        return {
            "time": self.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "type": self.action_type,
            "details": self.details
        }

# --- 3. METADATA & LOGIC ---
SUBJECT_PROXIMITY_MATRIX = {
    "Math": {"Math": 1.0, "Science": 0.85, "English": 0.2, "History": 0.1, "Sports": 0.05},
    "Science": {"Science": 1.0, "Math": 0.80, "History": 0.3, "English": 0.2, "Sports": 0.1},
    "English": {"English": 1.0, "History": 0.90, "Math": 0.2, "Science": 0.2, "Sports": 0.3},
    "History": {"History": 1.0, "English": 0.85, "Science": 0.4, "Math": 0.1, "Sports": 0.2},
    "Sports": {"Sports": 1.0, "History": 0.3, "Science": 0.2, "English": 0.2, "Math": 0.0}
}

RELATED_SUBJECTS = {
    "Math": ["Physics", "Science"],
    "Science": ["Math", "Biology"],
    "English": ["History", "Arts"],
    "History": ["English", "Civics"],
    "Sports": ["Games"]
}

TEACHER_METADATA = {
    f"Teacher {i}": {
        "subject": "Math" if i <= 5 else "Science" if i <= 10 else "English" if i <= 15 else "History" if i <= 20 else "Sports",
        "max_daily_workload": 6,
        "is_on_leave": False
    } for i in range(1, 36)
}

# --- 4. THE GRANDMASTER ENGINE ---
class GrandmasterSolver:
    def __init__(self, absent_teacher, schedule_snapshot):
        self.absent_teacher = absent_teacher
        self.schedule = schedule_snapshot
        self.best_solution = None
        self.max_utility = -float('inf')
        self.nodes_explored = 0 
        self.backtracks = 0
        self.constraints_failed = 0

    def solve(self):
        print(f"\n" + "="*80)
        print(f"🧠 NEXUS AI: INITIALIZING DEEP SEARCH PROTOCOL")
        
        tasks = self._get_missing_periods()
        tasks.sort(key=lambda t: self._count_available_teachers(t['p_idx']))
        
        self._backtrack(tasks, {})
        
        return self._format_solution()

    def _backtrack(self, remaining_tasks, current_assignment):
        self.nodes_explored += 1
        
        if not remaining_tasks:
            total_score = self._calculate_global_utility(current_assignment)
            if total_score > self.max_utility:
                self.max_utility = total_score
                self.best_solution = current_assignment.copy()
            return

        current_task = remaining_tasks[0]
        candidates = self._get_ordered_candidates(current_task, current_assignment)

        if not candidates:
            self.backtracks += 1
            return

        for teacher in candidates:
            current_assignment[current_task['period']] = teacher
            self._backtrack(remaining_tasks[1:], current_assignment)
            del current_assignment[current_task['period']]

    def _get_missing_periods(self):
        tasks = []
        absent_sched = self.schedule.get(self.absent_teacher, [])
        for idx, slot in enumerate(absent_sched):
            if slot and slot.upper() != "FREE" and "LUNCH" not in slot.upper():
                tasks.append({"p_idx": idx, "period": idx + 1, "subject": slot})
        return tasks

    def _count_available_teachers(self, p_idx):
        count = 0
        for name, sched in self.schedule.items():
            if name != self.absent_teacher and sched[p_idx].upper() == "FREE":
                count += 1
        return count

    def _get_ordered_candidates(self, task, current_assignment):
        candidates = []
        for name, sched in self.schedule.items():
            if name == self.absent_teacher: continue
            
            if sched[task['p_idx']].upper() != "FREE": 
                self.constraints_failed += 1
                continue
            
            current_subs = sum(1 for t in current_assignment.values() if t == name)
            if current_subs >= 2: 
                self.constraints_failed += 1
                continue 

            score = 0
            c_sub = TEACHER_METADATA.get(name, {}).get('subject', 'General')
            a_sub = TEACHER_METADATA.get(self.absent_teacher, {}).get('subject', 'General')
            
            if c_sub == a_sub: score += 50
            elif c_sub in RELATED_SUBJECTS.get(a_sub, []): score += 25
            
            candidates.append((name, score))
        
        candidates.sort(key=lambda x: x[1], reverse=True)
        return [c[0] for c in candidates]

    def _calculate_global_utility(self, assignment):
        score = 0
        workload = {}
        for teacher in assignment.values():
            workload[teacher] = workload.get(teacher, 0) + 1
        for count in workload.values():
            score -= (count ** 2) * 10 
        return score

    def _format_solution(self):
        if not self.best_solution:
            return []
        formatted = []
        for p_num, teacher in self.best_solution.items():
            # Create a log entry automatically when solution is found
            log_entry = MasterLog(
                action_type="AI_AUTO",
                details=f"Assigned {teacher} to Period {p_num} for {self.absent_teacher}"
            )
            db.session.add(log_entry)
            
            formatted.append({
                "period": p_num,
                "substitute": teacher,
                "status": "SUCCESS",
                "score": 99, 
                "details": f"Checked {self.nodes_explored} Futures" 
            })
        
        # Save logs to database
        try:
            db.session.commit()
        except:
            db.session.rollback()
            
        return sorted(formatted, key=lambda x: x['period'])

# --- 5. FLASK ROUTES ---

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/process', methods=['POST'])
def api_process():
    data = request.json
    solver = GrandmasterSolver(data.get('absentTeacher'), data.get('schedule'))
    assignments = solver.solve()
    return jsonify({"assignments": assignments})

@app.route('/api/share-note', methods=['POST'])
def share_note():
    data = request.json
    if not data or not data.get('content'):
        return jsonify({"error": "No content provided"}), 400

    token = str(uuid.uuid4())
    new_share = SharedContent(
        token=token, 
        content=data.get('content'), 
        title=data.get('title', 'Shared Note')
    )
    db.session.add(new_share)
    db.session.commit()
    
    base_url = request.host_url
    if not base_url.startswith('http'):
        base_url = f"http://{base_url}"
        
    share_url = f"{base_url}shared/{token}"
    return jsonify({"url": share_url})

@app.route('/shared/<token>')
def view_shared_note(token):
    note = SharedContent.query.filter_by(token=token).first()
    if not note: return "<h1>404 - Link Expired</h1>", 404
    
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{note.title}</title>
        <style>
            body {{ background: #020617; color: #cbd5e1; font-family: sans-serif; display: flex; justify-content: center; padding: 40px; }}
            .container {{ width: 100%; max-width: 1400px; }}
            h1 {{ color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📅 {note.title}</h1>
            {note.content}
        </div>
    </body>
    </html>
    """
    return render_template_string(html)

# --- NEW HISTORY ROUTES ---
@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        logs = MasterLog.query.order_by(MasterLog.timestamp.desc()).limit(50).all()
        return jsonify([log.to_dict() for log in logs])
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/api/reset-memory', methods=['POST'])
def reset_memory():
    try:
        db.session.query(MasterLog).delete()
        db.session.commit()
        return jsonify({"message": "Memory Wiped Successfully."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# --- 6. MAIN EXECUTION ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    print("✅ NEXUS AI SERVER ONLINE")
    app.run(debug=True, port=5001)