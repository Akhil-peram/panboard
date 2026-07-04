# Dashboard as a Service - Project Plan

This document outlines the architecture, features, and roadmap for the Dashboard as a Service application.

## Overview
A web-based platform that allows users to upload data files (CSV/Excel) and instantly visualize insights through interactive dashboards.

## Architecture
- **Backend**: FastAPI (Python)
  - Existing: File upload handling, Pandas-based data summary.
  - Location: `/backend`
- **Frontend**: React + Vite + Tailwind CSS (TypeScript)
  - Planned: Interactive UI for file uploads and data visualization.
  - Location: `/frontend`

## Features
- [x] **Phase 1: Frontend Setup**
  - Initialize Vite project with React and TypeScript.
  - Configure Tailwind CSS for styling.
  - Set up basic project structure (components, services, hooks).
- [x] **Phase 2: File Upload & API Integration**
  - Create upload component with drag-and-drop support.
  - Integrate with FastAPI `/api/upload` endpoint.
  - Handle loading states and error reporting.
- [x] **Phase 3: Data Visualization**
  - Display summary statistics (mean, median, etc.) returned by the backend.
  - Implement interactive charts (e.g., using Recharts or Chart.js).
  - Data table view for raw data inspection.
- [x] **Phase 4: Dashboard Polishing**
  - Responsive design using Tailwind CSS 4.
  - Switched to Heroicons for better reliability and integration.
  - Refined indigo-themed UI with clean animations and stats cards.
- [x] **Phase 5: Advanced EDA & Dynamic Charts**
  - Backend: Comprehensive data profiling (types, missing values, statistics, and top categories).
  - Frontend: Premium tabbed interface (Overview, Visualize, Data Table).
  - Interactive Charting: Enhanced support for Bar, Line, Area, Scatter, and Pie charts with dynamic data mapping.
  - Searchable raw data explorer with visual health indicators.

- [x] **Phase 6: Data Cleaning & Transformation**
  - Basic missing value handling (mean/median/mode/custom value imputation).
  - Column renaming and type casting.
  - Simple filtering and sorting within the dashboard (with reset functionality).

## Future Roadmap
- [ ] **Phase 7: Persistence & Export**
  - Exporting charts as PNG/SVG.
  - Exporting cleansed datasets as CSV.

## Conventions
- **Styling**: Tailwind CSS for all components.
- **Icons**: Lucide-react (replaced Heroicons for broader icon set and consistency).
- **Runtime**: Bun (recommended for frontend development and linting).
- **State Management**: React Hooks (useState/useMemo) for component state.
- **API Calls**: Native Fetch API in `/frontend/src/services/api.ts`.

## Development Workflow
1. Start backend: `cd backend && uv run main.py`
2. Start frontend: `cd frontend && bun dev` (or `npm run dev`)
