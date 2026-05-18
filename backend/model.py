import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score, confusion_matrix
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset.csv")
OUTPUTS_DIR = os.path.join(BASE_DIR, "..", "outputs")

# Global: trained once at startup
_model = None
_accuracy = None
_importances = None
_df = None

def train_model():
    global _model, _accuracy, _importances, _df
    _df = pd.read_csv(DATASET_PATH)

    X = _df[["Attendance", "Study_Hours", "Internal_Marks", "Assignment_Score", "Final_Marks"]]
    y = _df["Result"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    _model = DecisionTreeClassifier(random_state=42)
    _model.fit(X_train, y_train)

    y_pred = _model.predict(X_test)
    _accuracy = accuracy_score(y_test, y_pred)

    feature_names = ["Attendance", "Study_Hours", "Internal_Marks", "Assignment_Score", "Final_Marks"]
    _importances = dict(zip(feature_names, [round(float(v), 4) for v in _model.feature_importances_]))

    os.makedirs(OUTPUTS_DIR, exist_ok=True)
    with open(os.path.join(OUTPUTS_DIR, "accuracy.txt"), "w") as f:
        f.write(f"Accuracy: {_accuracy:.4f}")

    cm = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(5, 4))
    im = ax.imshow(cm, cmap='Blues')
    plt.colorbar(im)
    ax.set_xticks([0, 1]); ax.set_yticks([0, 1])
    ax.set_xticklabels(['Fail', 'Pass']); ax.set_yticklabels(['Fail', 'Pass'])
    ax.set_xlabel('Predicted'); ax.set_ylabel('Actual')
    ax.set_title('Confusion Matrix')
    for i in range(2):
        for j in range(2):
            ax.text(j, i, str(cm[i][j]), ha='center', va='center',
                    color='black', fontsize=14, fontweight='bold')
    plt.tight_layout()
    plt.savefig(os.path.join(OUTPUTS_DIR, "confusion_matrix.png"), dpi=100)
    plt.close()

    return _model, _accuracy, _importances, _df


def get_improvement_suggestions(attendance, study_hours, internal_marks, assignment_score, final_marks):
    suggestions = []
    if float(attendance) < 75:
        suggestions.append({
            "area": "Attendance",
            "tip": "Aim for at least 75% attendance. Missing classes directly reduces exam performance.",
            "icon": "fa-calendar-check", "color": "#ef4444"
        })
    if float(study_hours) < 2:
        suggestions.append({
            "area": "Study Hours",
            "tip": "Increase daily study time to at least 3 hours. Consistent effort compounds over time.",
            "icon": "fa-clock", "color": "#f59e0b"
        })
    if float(internal_marks) < 50:
        suggestions.append({
            "area": "Internal Marks",
            "tip": "Focus on internal tests and quizzes — they are easier to score and improve GPA significantly.",
            "icon": "fa-file-alt", "color": "#8b5cf6"
        })
    if float(assignment_score) < 60:
        suggestions.append({
            "area": "Assignments",
            "tip": "Complete all assignments on time. They reinforce concepts and carry grade weightage.",
            "icon": "fa-tasks", "color": "#06b6d4"
        })
    if float(final_marks) < 50:
        suggestions.append({
            "area": "Final Exam",
            "tip": "Revise core concepts and practice past papers. Focus on your weakest subjects first.",
            "icon": "fa-star", "color": "#ec4899"
        })
    if not suggestions:
        suggestions.append({
            "area": "Excellent Work!",
            "tip": "All metrics look strong. Maintain this consistency and challenge yourself further.",
            "icon": "fa-trophy", "color": "#16a34a"
        })
    return suggestions


def get_class_analytics():
    df = _df.copy()
    pass_count = int((df['Result'] == 'Pass').sum())
    fail_count = int((df['Result'] == 'Fail').sum())
    pass_rate = round((pass_count / len(df)) * 100, 1)

    class_avg = {
        "attendance": round(float(df['Attendance'].mean()), 1),
        "study_hours": round(float(df['Study_Hours'].mean()), 1),
        "internal_marks": round(float(df['Internal_Marks'].mean()), 1),
        "assignment_score": round(float(df['Assignment_Score'].mean()), 1),
        "final_marks": round(float(df['Final_Marks'].mean()), 1),
    }

    subject_avg = {
        "Math": round(float(df['Math_Marks'].mean()), 1),
        "Science": round(float(df['Science_Marks'].mean()), 1),
        "English": round(float(df['English_Marks'].mean()), 1),
        "History": round(float(df['History_Marks'].mean()), 1),
        "Computer": round(float(df['Computer_Marks'].mean()), 1),
    }

    # Weak students: attendance < 65 OR final < 40
    weak_mask = (df['Attendance'] < 65) | (df['Final_Marks'] < 40)
    weak_df = df[weak_mask].sort_values('Final_Marks')
    weak_students = []
    for _, row in weak_df.iterrows():
        reasons = []
        if row['Attendance'] < 65:
            reasons.append(f"Low Attendance ({int(row['Attendance'])}%)")
        if row['Final_Marks'] < 40:
            reasons.append(f"Low Final Marks ({int(row['Final_Marks'])})")
        weak_students.append({
            "id": int(row['Student_ID']),
            "name": str(row['Name']),
            "attendance": int(row['Attendance']),
            "final_marks": int(row['Final_Marks']),
            "result": str(row['Result']),
            "reasons": reasons
        })

    # Top performers
    top_df = df[df['Result'] == 'Pass'].nlargest(5, 'Final_Marks')
    toppers = []
    for _, row in top_df.iterrows():
        toppers.append({
            "id": int(row['Student_ID']),
            "name": str(row['Name']),
            "attendance": int(row['Attendance']),
            "final_marks": int(row['Final_Marks']),
        })

    return {
        "total_students": len(df),
        "pass_count": pass_count,
        "fail_count": fail_count,
        "pass_rate": pass_rate,
        "class_avg": class_avg,
        "subject_avg": subject_avg,
        "weak_students": weak_students,
        "toppers": toppers
    }


def get_correlation_data():
    df = _df.copy()
    return [
        {
            "x": int(row['Attendance']),
            "y": int(row['Final_Marks']),
            "name": str(row['Name']),
            "result": str(row['Result'])
        }
        for _, row in df.iterrows()
    ]