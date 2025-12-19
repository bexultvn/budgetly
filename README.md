# Budgetly

A lightweight, browser-only budgeting app built with HTML, CSS, and vanilla JS (plus a little jQuery). Track budgets, log expenses, and see quick insights with data saved to `localStorage`—no backend required.

## Features
- Email + password auth backed by `localStorage`; register new users or reuse existing accounts.
- Dashboard highlights: total budget vs. spend, remaining balance, risky budgets (>=80% used), and top spending category.
- Budgets page: create/edit/delete budgets, inline expense entry, progress bars, and per-budget expense tables.
- Expenses page: list all expenses with budget tags, date range filters, budget filter, and delete controls.
- Profile modal: edit name/email, upload avatar, and change password; session/logout handled client-side.

## Project Structure
- `index.html` – auth screen (login/register).
- `dashboard.html` – overview stats and recent expenses.
- `budgets.html` – budgets grid, details, and inline expense form.
- `expenses.html` – full expense table with filters.
- `css/` – shared styles (`main.css`) plus page-specific CSS.
- `js/` – logic split by page (`dashboard.js`, `budgets.js`, `expenses.js`) plus shared helpers (`storage.js`, `utils.js`, `auth.js`).

## Getting Started
1) Open `index.html` in your browser. (Optional: run `python3 -m http.server 8000` and open `http://localhost:8000/index.html`.)  
2) Register with a name, email, and password to create your own dataset, or log in with the demo account:  
   - Email: `demo@budgetly.app`  
   - Password: any 4+ characters (the demo account has no stored PIN).
3) Navigate via the sidebar to add budgets and expenses. Avatar in the sidebar opens profile settings; the logout button clears the session.

## Data & Reset
- All data is stored locally under keys prefixed with `financeData:` and session info under `financeSession`.
- Currency is formatted in KZT (₸); adjust in `js/utils.js` if needed.
- To reset, clear the `financeData:*` keys (or all site data) in your browser's devtools Application/Storage panel.
