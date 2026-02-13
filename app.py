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
def process_optimized_coverage(absent_teacher, schedule_snapshot):
    tracker = {t: 0 for t in schedule_snapshot.keys()}
    absent_schedule = schedule_snapshot.get(absent_teacher, [])
    
    # Task Extraction & Scarcity Sorting
    tasks = []
    for idx, content in enumerate(absent_schedule):
        if content.upper() != "FREE" and "LUNCH" not in content.upper():
            tasks.append({
                "p_idx": idx, "p_num": idx + 1, 
                "original_teacher": absent_teacher,
                "subject": TEACHER_METADATA[absent_teacher]['subject']
            })
    
    # Solve 'Hardest-to-Fill' subjects first (Backtracking Heuristic)
    tasks.sort(key=lambda x: sum(1 for t, m in TEACHER_METADATA.items() if m['subject'] == x['subject']))

    assignments = []
    for task in tasks:
        candidates_pool = []
        for teacher, teacher_sched in schedule_snapshot.items():
            if teacher == absent_teacher or teacher_sched[task['p_idx']].upper() != "FREE": continue
            
            # Workload Constraint Check
            if (sum(1 for p in teacher_sched if p.upper() != "FREE") + tracker[teacher]) >= 6: continue

            utility_score, audit = calculate_heuristic_utility(teacher, absent_teacher, task['p_idx'], tracker, tasks)
            candidates_pool.append({"name": teacher, "score": utility_score, "audit": audit})

        candidates_pool.sort(key=lambda x: x["score"], reverse=True)
        if candidates_pool:
            winner = candidates_pool[0]
            tracker[winner['name']] += 1
            assignments.append({"period": task["p_num"], "substitute": winner['name'], "status": "SUCCESS", "score": winner['score'], "details": " | ".join(winner['audit'])})
        else:
            assignments.append({"period": task["p_num"], "substitute": "Study Period", "status": "FALLBACK"})

    return sorted(assignments, key=lambda x: x['period'])# --- 3. FLASK INTERFACE ---
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