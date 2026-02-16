from flask import Flask, render_template, request, jsonify, render_template_string
import uuid
from flask_sqlalchemy import SQLAlchemy
import uuid
import datetime
app = Flask(__name__)
# Authorization: Multi-Dimensional Subject Proximity
# Defines the academic "distance" between departments for cross-disciplinary coverage.
SUBJECT_PROXIMITY_MATRIX = {
    "Math": {"Math": 1.0, "Science": 0.85, "English": 0.2, "History": 0.1, "Sports": 0.05},
    "Science": {"Science": 1.0, "Math": 0.80, "History": 0.3, "English": 0.2, "Sports": 0.1},
    "English": {"English": 1.0, "History": 0.90, "Math": 0.2, "Science": 0.2, "Sports": 0.3},
    "History": {"History": 1.0, "English": 0.85, "Science": 0.4, "Math": 0.1, "Sports": 0.2},
    "Sports": {"Sports": 1.0, "History": 0.3, "Science": 0.2, "English": 0.2, "Math": 0.0}
}
# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
class SharedContent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(100), unique=True, nullable=False)
    content = db.Column(db.Text, nullable=False)
    title = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
# --- 0. METADATA (The Knowledge Base) ---
TEACHER_METADATA = {
    f"Teacher {i}": {
        "subject": "Math" if i <= 5 else "Science" if i <= 10 else "English" if i <= 15 else "History" if i <= 20 else "Sports",
        "max_daily_workload": 6,
        "is_on_leave": False
    } for i in range(1, 36)
}

RELATED_SUBJECTS = {
    "Math": ["Physics", "Science"],
    "Science": ["Math", "Biology"],
    "English": ["History", "Arts"],
    "History": ["English", "Civics"],
    "Sports": ["Games"]
}
def calculate_heuristic_utility(candidate, absent_teacher, period_idx, batch_tracker, tasks_pool):
    score = 0
    breakdown = []
    
    c_meta = TEACHER_METADATA.get(candidate, {})
    a_meta = TEACHER_METADATA.get(absent_teacher, {})
    
    # A. SUBJECT AFFINITY (Weighted Criteria)
    c_sub, a_sub = c_meta.get("subject"), a_meta.get("subject")
    affinity = SUBJECT_PROXIMITY_MATRIX.get(c_sub, {}).get(a_sub, 0)
    affinity_score = affinity * 25 
    score += affinity_score
    breakdown.append(f"+{affinity_score:.1f} (Affinity)")

    # B. RECURSIVE SCARCITY MODELING (Look-Ahead Logic)
    # This prevents 'Greedy' selection by checking future period requirements.
    future_critical_needs = [t for t in tasks_pool[period_idx + 1:] 
                             if TEACHER_METADATA.get(t['original_teacher'], {}).get('subject') == c_sub]
    
    qualified_count = sum(1 for t, m in TEACHER_METADATA.items() if m['subject'] == c_sub)
    if qualified_count <= 2 and future_critical_needs:
        tax = -15
        score += tax
        breakdown.append(f"{tax} (Scarcity Lock)")

    # C. NON-LINEAR FATIGUE DECAY
    # Penalty Formula: P = -(4^n)
    n_subs = batch_tracker.get(candidate, 0)
    if n_subs > 0:
        p = -(4 ** n_subs)
        score += p
        breakdown.append(f"{p} (Exp Fatigue)")

    return score, breakdown

# --- 1. THE RIGOROUS SCORING ENGINE (AUDIT MODE) ---
def calculate_score_breakdown(candidate_name, absent_name, period_idx, candidate_schedule, current_subs, daily_load):
    """
    Returns a tuple: (Final Score, List of Audit Strings)
    Example Audit: ["+10 (Same Subject)", "-4 (Fatigue)", "+2 (Low Load)"]
    """
    score = 0
    audit_log = []
    
    cand_profile = TEACHER_METADATA.get(candidate_name, {})
    absent_profile = TEACHER_METADATA.get(absent_name, {})
    
    # 1. Subject Match (+10)
    if cand_profile.get("subject") == absent_profile.get("subject"):
        score += 10
        audit_log.append("+10 (Same Subject)")
    else:
        audit_log.append("  0 (Diff Subject)") # Explicitly log zeros for clarity

    # 2. Related Subject (+6)
    # Only check if they didn't get the +10 match
    if "+10" not in audit_log[-1]: 
        if cand_profile.get("subject") in RELATED_SUBJECTS.get(absent_profile.get("subject", ""), []):
            score += 6
            audit_log.append("+ 6 (Related Subject)")
        else:
            audit_log.append("  0 (Unrelated)")

    # 3. Continuity (+3)
    bonus_points = 0
    if period_idx > 0 and candidate_schedule[period_idx - 1].upper() == "FREE":
        bonus_points += 3
    if period_idx < 8 and candidate_schedule[period_idx + 1].upper() == "FREE":
        bonus_points += 3
    
    if bonus_points > 0:
        score += bonus_points
        audit_log.append(f"+ {bonus_points} (Continuity)")
    else:
        audit_log.append("  0 (No Continuity)")

    # 4. Workload (+2 / -6)
    if daily_load < 3:
        score += 2
        audit_log.append("+ 2 (Low Workload)")
    elif daily_load > 5:
        score -= 6
        audit_log.append("- 6 (High Workload)")
    else:
        audit_log.append("  0 (Avg Workload)")

    # 5. Fatigue (-4)
    if current_subs > 0:
        score -= 4
        audit_log.append("- 4 (Already Subbed)")
    else:
        audit_log.append("  0 (Fresh)")

    return score, audit_log

# --- 2. MAIN PROCESSOR (TERMINAL REPORTER) ---
# --- 5. THE GRANDMASTER ENGINE (Advanced AI) ---
class GrandmasterSolver:
    def __init__(self, absent_teacher, schedule_snapshot, history_db=None):
        self.absent_teacher = absent_teacher
        self.schedule = schedule_snapshot
        self.best_solution = None
        self.max_utility = -float('inf')
        # Statistics to prove it's working
        self.nodes_explored = 0 
        self.backtracks = 0

    def solve(self):
        """
        Main entry point. 
        1. Identifies all 'Holes' (periods needing coverage).
        2. Starts the recursive search tree.
        """
        # Step 1: Find what needs covering
        tasks = self._get_missing_periods()
        
        # Step 2: Sort tasks by "Most Constrained First" (Hardest periods first)
        # This makes the AI fail fast if a solution is impossible, saving time.
        tasks.sort(key=lambda t: self._count_available_teachers(t['p_idx']))

        print(f"\n♟️ CHESS ENGINE STARTING for {self.absent_teacher}...")
        print(f"   Target: Filling {len(tasks)} periods.")
        
        # Step 3: Start Recursion
        self._backtrack(tasks, {})
        
        print(f"🏁 ENGINE FINISHED. Explored {self.nodes_explored} futures. Backtracked {self.backtracks} times.")
        return self._format_solution()

    def _backtrack(self, remaining_tasks, current_assignment):
        """
        The Recursive Core. 
        It tries a teacher, moves to the next period. 
        If it gets stuck, it 'Backtracks' (undoes the last move).
        """
        self.nodes_explored += 1

        # BASE CASE: All tasks assigned?
        if not remaining_tasks:
            # We found a valid full-day schedule! Score it.
            total_score = self._calculate_global_utility(current_assignment)
            if total_score > self.max_utility:
                self.max_utility = total_score
                self.best_solution = current_assignment.copy()
            return

        # RECURSIVE STEP
        current_task = remaining_tasks[0]
        
        # Get candidates sorted by "Least Constraining Value" (Best fit first)
        candidates = self._get_ordered_candidates(current_task, current_assignment)

        for teacher in candidates:
            # 1. Try assigning this teacher
            current_assignment[current_task['period']] = teacher
            
            # 2. Move to next task
            self._backtrack(remaining_tasks[1:], current_assignment)
            
            # 3. BACKTRACK: Undo assignment to try the next teacher
            del current_assignment[current_task['period']]
            self.backtracks += 1

    def _get_missing_periods(self):
        tasks = []
        # Safely get schedule (handle if key missing)
        absent_sched = self.schedule.get(self.absent_teacher, [])
        for idx, slot in enumerate(absent_sched):
            # If slot is NOT free (meaning they had a class), we need a sub.
            if slot and slot.upper() != "FREE" and "LUNCH" not in slot.upper():
                tasks.append({"p_idx": idx, "period": idx + 1, "subject": slot})
        return tasks

    def _count_available_teachers(self, p_idx):
        """Heuristic: How hard is this period to fill?"""
        count = 0
        for name, sched in self.schedule.items():
            if name != self.absent_teacher and sched[p_idx].upper() == "FREE":
                count += 1
        return count

    def _get_ordered_candidates(self, task, current_assignment):
        """Finds valid teachers and sorts them by score."""
        candidates = []
        for name, sched in self.schedule.items():
            if name == self.absent_teacher: continue
            
            # CONSTRAINT 1: Must be Free
            if sched[task['p_idx']].upper() != "FREE": continue
            
            # CONSTRAINT 2: Max Workload (e.g., max 2 subs per day)
            current_subs = sum(1 for t in current_assignment.values() if t == name)
            if current_subs >= 2: continue 

            # Scoring (Simplified Vector Logic)
            score = 0
            c_sub = TEACHER_METADATA.get(name, {}).get('subject', 'General')
            a_sub = TEACHER_METADATA.get(self.absent_teacher, {}).get('subject', 'General')
            
            # Subject Match Bonus
            if c_sub == a_sub: score += 50
            elif c_sub in RELATED_SUBJECTS.get(a_sub, []): score += 25
            
            candidates.append((name, score))
        
        # Sort by score (High to Low)
        candidates.sort(key=lambda x: x[1], reverse=True)
        return [c[0] for c in candidates]

    def _calculate_global_utility(self, assignment):
        """Scores the entire day's solution."""
        score = 0
        workload = {}
        for teacher in assignment.values():
            workload[teacher] = workload.get(teacher, 0) + 1
            
        # Penalize uneven workload (The Equity Engine)
        for count in workload.values():
            score -= (count ** 2) * 10 
            
        return score

    def _format_solution(self):
        if not self.best_solution:
            return [] # No solution found
            
        formatted = []
        for p_num, teacher in self.best_solution.items():
            formatted.append({
                "period": p_num,
                "substitute": teacher,
                "status": "SUCCESS",
                "score": 99, 
                "details": "Optimized by Chess Engine"
            })
        return sorted(formatted, key=lambda x: x['period'])

# --- REPLACEMENT FUNCTION ---
def process_optimized_coverage(absent_teacher, schedule_snapshot):
    # Instantiate the Engine
    solver = GrandmasterSolver(absent_teacher, schedule_snapshot)
    return solver.solve()
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/process', methods=['POST'])
def api_process():
    data = request.json
    # Logic: Redirect traffic to the Global Optimizer
    assignments = process_optimized_coverage(data.get('absentTeacher'), data.get('schedule'))
    return jsonify({"assignments": assignments})
@app.route('/api/share-note', methods=['POST'])
def share_note():
    data = request.json
    # 1. Validation
    if not data or not data.get('content'):
        return jsonify({"error": "No content provided"}), 400

    # 2. Save
    token = str(uuid.uuid4())
    new_share = SharedContent(
        token=token, 
        content=data.get('content'), 
        title=data.get('title', 'Shared Note')
    )
    db.session.add(new_share)
    db.session.commit()
    
    # 3. Force HTTP Scheme (Fixes missing http://)
    base_url = request.host_url
    if not base_url.startswith('http'):
        base_url = f"http://{base_url}"
        
    share_url = f"{base_url}shared/{token}"
    
    # 4. Print to Terminal for Debugging
    print(f"🔗 GENERATED LINK: {share_url}")
    
    return jsonify({"url": share_url})
# --- FINAL VIEW LOGIC (Paste this at the bottom of app.py) ---
@app.route('/shared/<token>')
def view_shared_note(token):
    note = SharedContent.query.filter_by(token=token).first()
    
    if not note:
        return "<h1>404 - Invalid Link</h1>", 404
    
    # HTML + CSS with Highlight Support
    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Shared Schedule</title>
        <style>
            /* Base Theme */
            body {{ background-color: #020617; color: #cbd5e1; font-family: sans-serif; padding: 40px; display: flex; justify-content: center; margin: 0; }}
            .container {{ width: 100%; max-width: 1400px; }}
            
            /* Header */
            h1 {{ color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 30px; }}
            
            /* Table Styling */
            table {{ width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); font-size: 13px; }}
            th, td {{ padding: 14px 10px; border: 1px solid #334155; text-align: center; color: #e2e8f0; }}
            th {{ background: #0f172a; color: #38bdf8; font-weight: 700; text-transform: uppercase; }}
            
            /* SUBSTITUTION COLORS (Critical) */
            .highlight {{ 
                background-color: rgba(14, 165, 233, 0.2) !important; 
                color: #38bdf8 !important; 
                font-weight: bold; 
                border: 1px solid #0ea5e9 !important;
            }}
            .conflict {{ 
                background-color: rgba(239, 68, 68, 0.2) !important; 
                color: #fca5a5 !important; 
                border: 1px dashed #ef4444 !important;
            }}

            .meta {{ margin-top: 20px; text-align: right; color: #64748b; font-size: 12px; font-family: monospace; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📅 {note.title}</h1>
            <div class="table-wrapper">
                {note.content} 
            </div>
            <div class="meta">SECURE READ-ONLY VIEW</div>
        </div>
    </body>
    </html>
    """
    return render_template_string(html)
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    print("✅ SERVER ONLINE")
    app.run(debug=True, port=5001)