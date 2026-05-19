Power BI — EduAnalytics Dashboard

This folder contains suggested DAX measures and instructions to build a Power BI performance dashboard using the generated Excel from `outputs/student_data.xlsx`.

Quick steps

1. In Power BI Desktop, click `Get data` → `Excel` and open `outputs/student_data.xlsx` from the project root.
2. Select the `Students` sheet (and optionally `Summary`, `Subject_Average`, `Weak_Students`).
3. Mark the `Students` table as the primary table. Ensure numeric columns (`Attendance`, `Final_Marks`, subject columns) are type `Decimal Number` or `Whole Number` in the model.
4. Create the measures from `dax_measures.dax` (copy & paste into the measure editor).
5. Build visuals:
   - KPI cards: `Total Students`, `Pass Rate`, `Avg Final Marks`
   - Bar chart: Subject-wise averages (`Subject_Average` sheet) or create from `Students` by averaging per subject
   - Table: `Weak_Students` for quick action items
   - Scatter plot: `Attendance` (x) vs `Final_Marks` (y) with color by `Result` to visualize correlation

Tips

- If Power BI does not detect the `Students` table correctly, load the sheet as a table and use `Transform Data` to promote headers.
- Use `Top N` filter on a visual to show top 5 performers by `Final_Marks`.
- Add slicers for `Result` or subject filters to make the dashboard interactive.
