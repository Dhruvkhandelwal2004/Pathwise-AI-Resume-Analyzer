# Pathwise — AI Resume Analyzer & Career Guidance

Pathwise is an AI-powered career guidance platform designed to help students and freshers understand their resumes, explore suitable career paths, identify skill gaps, and plan their professional development.

## Features

- **Resume Upload & Extraction:** Upload PDF resumes and extract readable text.
- **Resume Analysis:** Generate structured resume insights, including education, skills, projects, experience, strengths, and improvement suggestions.
- **Resume Validation:** Validate uploaded documents before processing to help prevent unrelated files from entering the analysis pipeline.
- **Career Role Matching:** Compare resume evidence against predefined career-role requirements.
- **Skill Gap Identification:** Identify relevant skills that are not found in the resume.
- **Personalized Learning Roadmap:** Plan learning activities, projects, and career preparation steps.
- **FAQ & User Experience:** Provide clear guidance through an interactive interface.

## Tech Stack

**Frontend**
- React
- Vite
- React Router
- Axios
- Recharts
- Lucide React

**Backend**
- Node.js
- Express.js
- PDF parsing with `pdf-parse`
- Groq API for AI-powered resume analysis
- AJV for schema validation

## Supported Career Paths

- Data Analyst
- Java Developer
- Web / Full Stack Developer
- AI Automation Developer
- Prompt Engineer

## Getting Started

### Prerequisites
- Node.js and npm
- A Groq API key for AI-powered resume analysis

### Backend Setup

1. Navigate to the backend directory:

   `cd backend`

2. Install dependencies:

   `npm install`

3. Create a local `.env` file using `.env.example` as a reference.

4. Configure the required environment variables:

   - `AI_PROVIDER`
   - `GROQ_API_KEY`
   - `GROQ_MODEL`
   - `AI_TIMEOUT_MS`

5. Start the backend using the scripts defined in `backend/package.json`.

### Frontend Setup

Navigate to the frontend directory, install dependencies, and start the Vite development server using the scripts defined in its `package.json`.

## Security & Privacy

- Keep API keys in environment variables and never commit them to GitHub.
- Do not commit uploaded resumes or other personal information.
- Review `.gitignore` before pushing the repository.
- Resume processing and AI-provider availability depend on the current implementation and configuration.

## Project Status

Pathwise is under active development. Features, validation rules, and career guidance workflows may evolve as the project progresses.

## Future Improvements

- More robust resume-content validation
- Transparent resume scoring
- Expanded career-role catalogue
- Detailed skill-gap analysis
- Personalized learning resources and project recommendations
- Progress tracking and roadmap reassessment

## Disclaimer

Pathwise provides career guidance and resume improvement suggestions for educational purposes. Its scores and recommendations are not guarantees of hiring outcomes or job placement.
