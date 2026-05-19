import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset.csv")
OUTPUTS_DIR = os.path.join(BASE_DIR, "..", "outputs")
os.makedirs(OUTPUTS_DIR, exist_ok=True)


def safe_read_csv(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"Dataset not found at {path}")
    return pd.read_csv(path)


def build_summary(df):
    total = len(df)
    pass_count = int((df['Result'] == 'Pass').sum()) if 'Result' in df.columns else 0
    fail_count = total - pass_count
    pass_rate = round((pass_count / total) * 100, 1) if total > 0 else 0.0

    class_avg_cols = [c for c in ['Attendance', 'Study_Hours', 'Internal_Marks', 'Assignment_Score', 'Final_Marks'] if c in df.columns]
    class_avg = df[class_avg_cols].mean().round(1) if class_avg_cols else pd.Series()

    subject_cols = [c for c in df.columns if c.endswith('_Marks') and c not in ('Internal_Marks', 'Final_Marks')]
    subject_avg = df[subject_cols].mean().round(1) if subject_cols else pd.Series()

    weak_mask = False
    if 'Attendance' in df.columns and 'Final_Marks' in df.columns:
        weak_mask = (df['Attendance'] < 65) | (df['Final_Marks'] < 40)
        weak_students = df[weak_mask].sort_values('Final_Marks')
    else:
        weak_students = pd.DataFrame()

    return {
        'total_students': total,
        'pass_count': pass_count,
        'fail_count': fail_count,
        'pass_rate': pass_rate,
        'class_avg': class_avg,
        'subject_avg': subject_avg,
        'weak_students': weak_students
    }


def write_outputs(df, summary, out_xlsx_path):
    # Try to use openpyxl (commonly available). If not installed, fall back to CSV files.
    try:
        import openpyxl  # noqa: F401
        engine = 'openpyxl'
    except Exception:
        engine = None

    if engine:
        with pd.ExcelWriter(out_xlsx_path, engine=engine) as writer:
            df.to_excel(writer, sheet_name='Students', index=False)

            # Summary sheet
            summary_df = pd.DataFrame({
                'metric': ['total_students', 'pass_count', 'fail_count', 'pass_rate'],
                'value': [summary['total_students'], summary['pass_count'], summary['fail_count'], summary['pass_rate']]
            })
            summary_df.to_excel(writer, sheet_name='Summary', index=False)

            # Class averages
            if not summary['class_avg'].empty:
                summary['class_avg'].to_frame('average').to_excel(writer, sheet_name='Class_Average')

            # Subject averages
            if not summary['subject_avg'].empty:
                summary['subject_avg'].to_frame('average').to_excel(writer, sheet_name='Subject_Average')

            # Weak students
            if not summary['weak_students'].empty:
                summary['weak_students'].to_excel(writer, sheet_name='Weak_Students', index=False)

        print(f"Created Excel: {out_xlsx_path}")
    else:
        # Fallback: CSV exports
        csv_base = os.path.splitext(out_xlsx_path)[0]
        df.to_csv(csv_base + '_students.csv', index=False)
        summary_df = pd.DataFrame({
            'metric': ['total_students', 'pass_count', 'fail_count', 'pass_rate'],
            'value': [summary['total_students'], summary['pass_count'], summary['fail_count'], summary['pass_rate']]
        })
        summary_df.to_csv(csv_base + '_summary.csv', index=False)
        if not summary['weak_students'].empty:
            summary['weak_students'].to_csv(csv_base + '_weak_students.csv', index=False)
        print("openpyxl not installed in the venv. Wrote CSV fallbacks to outputs/. To create XLSX, install openpyxl in your backend venv:")
        print("    pip install openpyxl")


def main():
    try:
        df = safe_read_csv(DATASET_PATH)
    except FileNotFoundError as e:
        print(e)
        return

    summary = build_summary(df)
    out_xlsx = os.path.join(OUTPUTS_DIR, 'student_data.xlsx')
    write_outputs(df, summary, out_xlsx)


if __name__ == '__main__':
    main()
