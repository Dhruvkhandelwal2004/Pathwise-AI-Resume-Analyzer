export const CHAT_WELCOME_MESSAGE =
  'Hi there! 👋 Welcome to Pathwise. What would you like help with today?'

export const CHAT_MAIN_MENU_MESSAGE =
  'Of course! 😊 What would you like help with next?'

export const CHAT_CATEGORIES = [
  {
    id: 'getting-started',
    label: 'Getting started',
    prompt: 'Here are a few helpful places to begin.',
    questionIds: ['what-can-pathwise-do', 'where-should-i-start', 'how-does-it-work'],
  },
  {
    id: 'resume-career',
    label: 'Resume & Career',
    prompt: 'Choose a resume or career question below.',
    questionIds: [
      'resume-weak',
      'improve-resume',
      'no-experience',
      'showcase-projects',
      'score-low',
      'career-right',
      'career-confused',
      'data-or-developer',
      'choose-target-role',
      'why-resume-rejected',
      'improve-score',
      'which-career-suits-me',
      'skills-missing',
      'skill-first',
    ],
  },
  {
    id: 'learning-growth',
    label: 'Learning & Growth',
    prompt: 'Let’s explore learning, projects, interviews, and progress.',
    questionIds: [
      'dont-know-start',
      'learn-first',
      'too-many-skills',
      'learn-without-stuck',
      'study-daily',
      'stay-consistent',
      'build-project',
      'practise-skills',
      'prepare-interviews',
      'track-progress',
    ],
  },
  {
    id: 'projects-practical-skills',
    label: 'Projects & Practical Skills',
    prompt: 'Choose a project or practical-skills question below.',
    questionIds: [
      'project-to-build',
      'theory-cant-build',
      'first-portfolio',
      'project-ideas',
      'prove-skills',
    ],
  },
  {
    id: 'jobs-interviews',
    label: 'Jobs & Interviews',
    prompt: 'Choose a job-readiness or interview question below.',
    questionIds: [
      'job-ready',
      'prepare-interviews',
      'keep-getting-rejected',
      'find-skill-gaps',
      'improve-next',
    ],
  },
  {
    id: 'other-questions',
    label: 'Other questions',
    prompt: 'Here are a few other common Pathwise questions.',
    questionIds: ['pathwise-free', 'resume-data-safe', 'something-not-working'],
  },
]

export const CHAT_QUESTIONS = [
  {
    id: 'what-can-pathwise-do',
    question: 'What can Pathwise do?',
    answer:
      'Pathwise helps you understand your resume, explore suitable career paths, identify skill gaps, and create a personalized learning roadmap to prepare for your career.',
    followUps: ['where-should-i-start', 'which-career-suits-me'],
  },
  {
    id: 'where-should-i-start',
    question: 'Where should I start?',
    answer:
      'Start by uploading your resume. Pathwise can analyze your resume, help you explore career matches, and guide you toward the skills you need to develop.',
    followUps: ['upload-resume', 'what-can-pathwise-do'],
  },
  {
    id: 'how-does-it-work',
    question: 'How does it work?',
    answer:
      'Pathwise follows a simple process: upload your resume, review your analysis, explore career matches, choose a target role, and follow your skills roadmap.',
    followUps: ['improve-score', 'get-roadmap'],
  },
  {
    id: 'why-resume-rejected',
    question: 'Why was my resume rejected?',
    answer:
      'Your file may have been rejected because its format is unsupported, the file is damaged, or readable resume content could not be extracted. Check the upload requirements and try again.',
    followUps: ['supported-formats', 'something-not-working'],
  },
  {
    id: 'improve-score',
    question: 'How can I improve my score?',
    answer:
      'Review your resume feedback, identify missing or unclear sections, and improve the presentation of your genuine skills, projects, education, and experience. Reanalyse the updated resume to review the changes.',
    followUps: ['skills-missing', 'build-project'],
  },
  {
    id: 'which-career-suits-me',
    question: 'Which career suits me?',
    answer:
      'Explore your career-role matches to see which roles align with the skills and experience identified in your resume. Treat the results as guidance, not a final decision about your abilities.',
    followUps: ['skills-missing', 'skill-first'],
  },
  {
    id: 'skills-missing',
    question: 'What skills am I missing?',
    answer:
      'Compare your current resume evidence with the requirements of your target role. Skills not found in your resume may simply be undocumented, so confirm your actual abilities before deciding what to learn.',
    followUps: ['skill-first', 'practise-skills'],
  },
  {
    id: 'skill-first',
    question: 'Which skill should I learn first?',
    answer:
      'Start with a high-priority skill that your target role requires and that you haven’t yet demonstrated. Follow your roadmap’s recommended order, practise the skill, and apply it in a small project.',
    followUps: ['practise-skills', 'build-project'],
  },
  {
    id: 'build-project',
    question: 'How do I build a project?',
    answer:
      'Choose a project related to your target role, define the problem it solves, break it into small tasks, and build it step by step. Document your work and add the finished project to your portfolio.',
    followUps: ['suggest-project', 'practise-skills'],
  },
  {
    id: 'practise-skills',
    question: 'How can I practise my skills?',
    answer:
      'Apply what you learn through small exercises, quizzes, real-world problems, and practical projects. Regular practice and demonstrable results help you understand your progress.',
    followUps: ['build-project', 'skill-first'],
  },
  {
    id: 'prepare-interviews',
    question: 'How do I prepare for interviews?',
    answer:
      'Revise role-specific fundamentals, practise common technical and HR questions, and prepare to explain your projects and decisions. Practise answering aloud and review areas where your answers lack clarity or depth.',
    followUps: ['prove-skills', 'improve-next'],
  },
  {
    id: 'track-progress',
    question: 'How can I track my progress?',
    answer:
      'Mark completed learning tasks, record your project work, and review your roadmap milestones. Revisit your skills and resume periodically to see what has improved.',
    followUps: ['get-roadmap', 'improve-score'],
  },
  {
    id: 'pathwise-free',
    question: 'Is Pathwise completely free?',
    answer:
      'Yes! Pathwise is designed to be free to use without requiring a login. Some features may depend on service availability and the current implementation.',
    followUps: ['what-can-pathwise-do', 'resume-data-safe'],
  },
  {
    id: 'resume-data-safe',
    question: 'Is my resume data safe?',
    answer:
      'Pathwise is designed to process resume files in memory rather than store uploaded files permanently. Please review the actual privacy policy for details about AI processing, data handling, and any external services used.',
    followUps: ['resume-analysis', 'something-not-working'],
  },
  {
    id: 'something-not-working',
    question: "Something isn't working",
    answer:
      'Check that your file is in a supported format, is within the upload size limit, and contains readable resume content. If the problem continues, try again later or revisit the upload section.',
    followUps: ['supported-formats', 'why-resume-rejected'],
  },

  // Additional guided questions supplied for common resume, career, learning,
  // project, and job-readiness concerns.
  {
    id: 'resume-weak',
    question: 'Why is my resume weak?',
    answer:
      "Your resume may not clearly show your skills, projects, achievements, or relevant experience. Review your resume feedback and improve the sections that need more clarity. Remember, a low score doesn't define your potential.",
    followUps: ['improve-resume', 'no-experience'],
  },
  {
    id: 'no-experience',
    question: 'I have no experience. Now what?',
    answer:
      "Don't worry! You can build a strong starting resume as a fresher. Highlight academic projects, personal projects, internships, coursework, certifications, and relevant skills you genuinely possess. You don't need to invent work experience.",
    followUps: ['project-to-build', 'first-portfolio'],
  },
  {
    id: 'showcase-projects',
    question: 'How do I showcase my projects?',
    answer:
      'Explain each project using four points: the problem it solves, the technologies used, your contribution, and the result. Add a GitHub repository or live demo when available, and clearly mention your own contribution to team projects.',
    followUps: ['project-ideas', 'prove-skills'],
  },
  {
    id: 'score-low',
    question: 'Why is my resume score low?',
    answer:
      "Your score may reflect gaps in resume completeness, clarity, relevant skills, or project evidence, depending on Pathwise's scoring criteria. Review the score breakdown to identify the specific areas for improvement. A score is guidance, not a guarantee of hiring success.",
    followUps: ['improve-resume', 'find-skill-gaps'],
  },
  {
    id: 'career-right',
    question: 'Which career is right for me?',
    answer:
      "The right career depends on your interests, existing skills, strengths, and goals. Explore Pathwise's available career matches, review the evidence behind each result, and choose a direction that genuinely interests you.",
    followUps: ['data-or-developer', 'choose-target-role'],
  },
  {
    id: 'career-confused',
    question: "I'm confused about my career.",
    answer:
      "That's completely normal! Start by identifying what you enjoy, what you are good at, and what kind of work you want to do. Explore a few career options, compare their requirements, and try a small project before making a decision.",
    followUps: ['career-right', 'learn-first'],
  },
  {
    id: 'data-or-developer',
    question: 'Data Analyst or Developer?',
    answer:
      'Choose Data Analytics if you enjoy working with data, finding patterns, and solving business problems. Consider Development if you enjoy programming, designing applications, and building software. Try one beginner project in each field to understand which suits you better.',
    followUps: ['learn-first', 'choose-target-role'],
  },
  {
    id: 'learn-first',
    question: 'What should I learn first?',
    answer:
      'First, choose your target career. Then identify its essential skills and compare them with what you already know. Start with the most important missing foundational skill and practise it before moving to advanced topics.',
    followUps: ['too-many-skills', 'learn-without-stuck'],
  },
  {
    id: 'choose-target-role',
    question: 'How do I choose a target role?',
    answer:
      'Compare your interests, current skills, project experience, and the requirements of each available role. Select one primary target to guide your learning plan. You can change your target later as your interests and abilities develop.',
    followUps: ['career-right', 'find-skill-gaps'],
  },
  {
    id: 'dont-know-start',
    question: "I don't know where to start.",
    answer:
      "Start small: choose one career goal, identify its foundational skills, and create a simple learning plan. Learn one concept, practise it, and apply it in a small task. You don't need to master everything on day one.",
    followUps: ['learn-first', 'study-daily'],
  },
  {
    id: 'too-many-skills',
    question: 'I have too many skills to learn.',
    answer:
      "Don't try to learn everything together. Prioritise skills according to your target role: essential skills first, supporting skills next, and advanced topics later. Focus on depth and practical application rather than collecting course certificates.",
    followUps: ['learn-first', 'stay-consistent'],
  },
  {
    id: 'learn-without-stuck',
    question: 'How do I learn without getting stuck?',
    answer:
      'Break difficult topics into smaller steps. Study one concept, practise a simple example, and build on it gradually. When stuck, review the basics, read documentation, and identify the exact problem instead of restarting the entire course.',
    followUps: ['practise-skills', 'project-to-build'],
  },
  {
    id: 'study-daily',
    question: 'How much should I study daily?',
    answer:
      'Start with 45–90 minutes of focused learning each day if your schedule allows. For example, spend 25 minutes learning, 30 minutes practising, and 10 minutes reviewing. Adjust the time according to your commitments and energy.',
    followUps: ['stay-consistent', 'dont-know-start'],
  },
  {
    id: 'stay-consistent',
    question: 'How do I stay consistent?',
    answer:
      'Set a small daily goal, study at a fixed time, and track what you complete. Focus on showing up regularly rather than studying for long hours occasionally. If you miss a day, simply resume the next day without guilt.',
    followUps: ['study-daily', 'learn-without-stuck'],
  },
  {
    id: 'project-to-build',
    question: 'Which project should I build?',
    answer:
      'Choose a project that matches your target career and current skill level. Start with a manageable problem, build a working solution, and gradually add features. A completed, well-explained project is often more useful than several unfinished ones.',
    followUps: ['project-ideas', 'first-portfolio'],
  },
  {
    id: 'theory-cant-build',
    question: "I know theory but can't build.",
    answer:
      'Start applying each concept immediately through small exercises. If you know SQL, analyse a dataset. If you know web development, build a simple website. If you know Python, automate a repetitive task. Increase complexity gradually.',
    followUps: ['practise-skills', 'project-to-build'],
  },
  {
    id: 'first-portfolio',
    question: 'How do I make my first portfolio?',
    answer:
      "Select two or three relevant projects, create a clean portfolio page, and explain each project's purpose, tools, features, and results. Include working demos or GitHub links where possible, and ensure every project accurately represents your contribution.",
    followUps: ['showcase-projects', 'prove-skills'],
  },
  {
    id: 'project-ideas',
    question: 'How do I get project ideas?',
    answer:
      'Look for everyday problems, repetitive tasks, or challenges in your chosen field. Turn them into small practical projects. For example, analyse sales data, build a task manager, or automate a document-processing workflow.',
    followUps: ['project-to-build', 'first-portfolio'],
  },
  {
    id: 'prove-skills',
    question: 'How can I prove my skills?',
    answer:
      'Demonstrate your skills through working projects, practical assessments, clear documentation, and a portfolio. Share code, dashboards, demos, or project reports where appropriate. Make sure you can explain how your work was built and what you contributed.',
    followUps: ['showcase-projects', 'job-ready'],
  },
  {
    id: 'job-ready',
    question: 'Am I ready for a job?',
    answer:
      'Check whether you can demonstrate the essential skills for your target role, complete relevant practical tasks, explain your projects, and communicate your decisions clearly. Use job descriptions to identify gaps. No single resume score can guarantee job readiness.',
    followUps: ['find-skill-gaps', 'prepare-interviews'],
  },
  {
    id: 'keep-getting-rejected',
    question: 'I keep getting rejected. Why?',
    answer:
      "Rejections can happen for many reasons, including role mismatch, missing skills, resume clarity, interview performance, or competition. Review the feedback you receive, compare your profile with job requirements, and improve one area at a time. Rejection alone doesn't tell you the exact reason.",
    followUps: ['improve-resume', 'prepare-interviews'],
  },
  {
    id: 'find-skill-gaps',
    question: 'How do I find my skill gaps?',
    answer:
      "Choose a target role and compare its required skills with your demonstrated abilities. Separate skills you already know, skills you need to practise, and skills you haven't learned yet. Prioritise the gaps that matter most for your target role.",
    followUps: ['learn-first', 'project-to-build'],
  },
  {
    id: 'improve-next',
    question: 'What should I improve next?',
    answer:
      'Focus on the highest-priority gap affecting your current goal. Choose one concrete action, such as practising a skill, improving a resume section, or completing a project milestone. Finish it, review the result, and then move to the next task.',
    followUps: ['find-skill-gaps', 'track-progress'],
  },

  // Branch-only answers required by the supplied follow-up buttons.
  {
    id: 'upload-resume',
    question: 'How do I upload my resume?',
    answer:
      'Choose Upload Resume/CV, then drag and drop a resume or browse from your device. Once the file is validated, choose Run Full Resume Audit.',
    followUps: ['supported-formats', 'why-resume-rejected'],
  },
  {
    id: 'supported-formats',
    question: 'Which formats are supported?',
    answer:
      'Pathwise accepts genuine PDF, DOC, and DOCX resume files up to 5 MB. It checks the extension, reported file type, and actual file content before analysis.',
    followUps: ['upload-resume', 'why-resume-rejected'],
  },
  {
    id: 'get-roadmap',
    question: 'How do I get my roadmap?',
    answer:
      'Open Career Match after your resume analysis, select an approved target role, and choose Build My Skills Roadmap. Pathwise will organize the identified gaps into three preparation stages.',
    followUps: ['which-career-suits-me', 'track-progress'],
  },
  {
    id: 'suggest-project',
    question: 'Suggest a project',
    answer:
      'Open your skills roadmap and expand a relevant gap. Its Practice / Project section provides a focused project idea connected to your selected role and the skill you need to demonstrate.',
    followUps: ['build-project', 'get-roadmap'],
  },
  {
    id: 'improve-resume',
    question: 'How can I improve my resume?',
    answer:
      'Start by making your resume clear, relevant, and easy to read. Highlight genuine skills, practical projects, education, and achievements that match your target role. Use specific examples instead of vague statements.',
    followUps: ['score-low', 'showcase-projects'],
  },
  {
    id: 'resume-analysis',
    question: 'How does resume analysis work?',
    answer:
      'Pathwise validates the document, extracts readable text, and uses the configured AI provider to structure explicit resume evidence. The structured result is validated before deterministic scoring and career matching are calculated.',
    followUps: ['improve-score', 'resume-data-safe'],
  },
]

export const CHAT_CATEGORY_BY_ID = Object.fromEntries(
  CHAT_CATEGORIES.map((category) => [category.id, category]),
)

export const CHAT_QUESTION_BY_ID = Object.fromEntries(
  CHAT_QUESTIONS.map((question) => [question.id, question]),
)
