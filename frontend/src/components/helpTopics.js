export const CHAT_WELCOME_MESSAGE =
  'Hi there! 👋 Welcome to Pathwise. What would you like help with today?'

export const CHAT_MAIN_MENU_MESSAGE =
  'Of course! 😊 What would you like help with next?'

export const CHAT_CATEGORIES = [
  {
    id: 'getting-started',
    label: 'Getting started',
    prompt: 'Here are a few helpful places to begin.',
    questionIds: [
      'how-use-pathwise',
      'can-use-as-fresher',
      'after-uploading',
      'explore-multiple-careers',
      'get-started-no-experience',
      'pathwise-career-guidance',
      'what-can-pathwise-do',
      'where-should-i-start',
      'how-does-it-work',
    ],
  },
  {
    id: 'resume-career',
    label: 'Resume & Career',
    prompt: 'Choose a resume or career question below.',
    questionIds: [
      'write-first-resume',
      'skills-to-highlight',
      'describe-academic-projects',
      'add-college-assignments',
      'explain-career-gap',
      'tailor-resume-for-role',
      'resume-without-certifications',
      'switch-career-paths',
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
      'make-study-plan',
      'skills-in-demand',
      'learn-skill-from-scratch',
      'revise-learning',
      'balance-college-learning',
      'measure-learning-progress',
      'theory-or-practice-first',
      'avoid-tutorial-overload',
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
      'start-first-project',
      'choose-project-difficulty',
      'build-project-without-team',
      'debug-project-errors',
      'write-project-documentation',
      'upload-project-github',
      'deploy-project-online',
      'improve-existing-project',
      'make-project-unique',
      'project-readme-contents',
      'explain-project-in-interviews',
      'turn-idea-into-product',
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
      'find-fresher-jobs',
      'prepare-aptitude-tests',
      'answer-hr-questions',
      'explain-college-projects',
      'portfolio-contents',
      'prepare-technical-round',
      'apply-without-internship',
      'improve-communication',
      'handle-interview-rejection',
      'prepare-campus-placements',
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
    questionIds: [
      'use-without-account',
      'pathwise-free-to-use',
      'uploaded-resume-handling',
      'file-not-uploading',
      'analysis-failed',
      'score-looks-incorrect',
      'download-roadmap',
      'report-technical-issue',
      'pathwise-free',
      'resume-data-safe',
      'something-not-working',
    ],
  },
]

const CORE_CHAT_QUESTIONS = [
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

// Questions supplied in the expanded Pathwise help catalogue. These remain
// separate from the original set so the existing guided flows stay intact.
const EXPANDED_CHAT_QUESTIONS = [
  {
    id: 'how-use-pathwise',
    question: 'How do I use Pathwise?',
    answer:
      'Pathwise helps you review your resume, explore career options, identify skill gaps, and plan your learning. Start by uploading your resume, then review your analysis and explore your career matches.',
    followUps: ['after-uploading'],
  },
  {
    id: 'can-use-as-fresher',
    question: 'Can I use it as a fresher?',
    answer:
      'Absolutely! Pathwise is useful for students and freshers too. You can highlight your education, academic projects, skills, and certifications even if you have no work experience.',
    followUps: ['get-started-no-experience'],
  },
  {
    id: 'after-uploading',
    question: 'What should I do after uploading?',
    answer:
      'Review the information extracted from your resume, check the feedback, and explore career roles that interest you. Then identify the skills you need to develop for your chosen direction.',
    followUps: ['choose-target-role'],
  },
  {
    id: 'explore-multiple-careers',
    question: 'Can I explore multiple careers?',
    answer:
      "Yes, you can compare available career options and explore their requirements. Choose a primary target when you're ready to build a focused learning plan.",
    followUps: ['switch-career-paths'],
  },
  {
    id: 'get-started-no-experience',
    question: 'How do I get started with no experience?',
    answer:
      'Start with your current knowledge. Choose one career direction, learn its fundamentals, complete a small practical project, and gradually build a portfolio that demonstrates your abilities.',
    followUps: ['project-to-build'],
  },
  {
    id: 'pathwise-career-guidance',
    question: 'How can Pathwise guide my career?',
    answer:
      'Pathwise can help you understand your resume, explore career matches, and identify learning priorities. Use its recommendations alongside your interests, practical experience, and career goals.',
    followUps: [],
  },
  {
    id: 'write-first-resume',
    question: 'How do I write my first resume?',
    answer:
      'Start with your contact details, career objective or summary, education, technical skills, projects, and relevant certifications. Keep the layout clear and include only accurate information.',
    followUps: ['skills-to-highlight'],
  },
  {
    id: 'skills-to-highlight',
    question: 'Which skills should I highlight?',
    answer:
      'Highlight skills that are relevant to your target role and that you can genuinely demonstrate. Support important skills with examples from your projects, coursework, internships, or practical experience.',
    followUps: ['tailor-resume-for-role'],
  },
  {
    id: 'describe-academic-projects',
    question: 'How do I describe academic projects?',
    answer:
      'Explain the problem, your solution, the technologies used, and your personal contribution. Include measurable results only when you have real evidence to support them.',
    followUps: ['add-college-assignments'],
  },
  {
    id: 'add-college-assignments',
    question: 'Should I add college assignments?',
    answer:
      'Yes, if an assignment demonstrates relevant skills or meaningful work. Prioritise substantial assignments that solve a problem, involve practical implementation, or show your understanding of the subject.',
    followUps: ['showcase-projects'],
  },
  {
    id: 'explain-career-gap',
    question: 'How do I explain a career gap?',
    answer:
      'Be honest and concise. Explain what you were doing during that period and mention relevant learning, projects, or responsibilities if applicable. Never invent experience to fill a gap.',
    followUps: ['write-first-resume'],
  },
  {
    id: 'tailor-resume-for-role',
    question: 'How do I tailor my resume for a role?',
    answer:
      'Review the job description and identify its important requirements. Highlight your relevant skills and projects, use accurate role-related terminology, and remove unrelated details where appropriate.',
    followUps: ['skills-to-highlight'],
  },
  {
    id: 'resume-without-certifications',
    question: 'What if my resume has no certifications?',
    answer:
      "That's okay. Certifications are not the only way to demonstrate skills. Focus on relevant projects, practical abilities, education, and evidence of what you can build or accomplish.",
    followUps: ['showcase-projects'],
  },
  {
    id: 'switch-career-paths',
    question: 'How do I switch career paths?',
    answer:
      'Identify transferable skills, learn the fundamentals of your new field, and build projects that demonstrate your ability. Update your resume to emphasise relevant evidence rather than unrelated experience.',
    followUps: ['career-right'],
  },
  {
    id: 'make-study-plan',
    question: 'How do I make a study plan?',
    answer:
      'Set a clear career goal, divide the required skills into smaller topics, and schedule regular learning and practice sessions. Include weekly milestones so you can review your progress.',
    followUps: ['study-daily'],
  },
  {
    id: 'skills-in-demand',
    question: 'Which skills are in demand for my role?',
    answer:
      'Start by reviewing current job descriptions for your target role. Identify the skills that appear repeatedly, distinguish essential requirements from optional ones, and prioritise the most relevant skills.',
    followUps: ['learn-first'],
  },
  {
    id: 'learn-skill-from-scratch',
    question: 'How do I learn a skill from scratch?',
    answer:
      'Begin with the fundamentals, follow one structured learning resource, and practise each concept with small exercises. Once you understand the basics, apply them in a practical project.',
    followUps: ['learn-without-stuck'],
  },
  {
    id: 'revise-learning',
    question: "How do I revise what I've learned?",
    answer:
      'Revisit your notes, explain concepts in your own words, solve practice questions, and build small examples without following a tutorial. Review difficult topics more frequently.',
    followUps: ['practise-skills'],
  },
  {
    id: 'balance-college-learning',
    question: 'How do I balance college and learning?',
    answer:
      'Set realistic weekly goals around your classes, assignments, and exams. Even 30–60 minutes of focused practice on suitable days can help you maintain momentum.',
    followUps: ['stay-consistent'],
  },
  {
    id: 'measure-learning-progress',
    question: 'How do I measure my learning progress?',
    answer:
      'Track completed topics, solved exercises, projects built, and concepts you can explain independently. Focus on what you can actually do rather than only counting study hours.',
    followUps: ['prove-skills'],
  },
  {
    id: 'theory-or-practice-first',
    question: 'Should I learn theory or practise first?',
    answer:
      'Combine both. Learn enough theory to understand a concept, practise it immediately, and apply it in a small task. This helps connect knowledge with real-world use.',
    followUps: ['theory-cant-build'],
  },
  {
    id: 'avoid-tutorial-overload',
    question: 'How do I avoid tutorial overload?',
    answer:
      "Choose one primary course or learning resource and follow it until you can apply the concepts. Avoid switching between multiple tutorials before practising what you've already learned.",
    followUps: ['make-study-plan'],
  },
  {
    id: 'start-first-project',
    question: 'How do I start my first project?',
    answer:
      'Choose a small problem you understand, define what the project should do, and list its essential features. Build a basic working version first, test it, and add improvements gradually.',
    followUps: ['choose-project-difficulty'],
  },
  {
    id: 'choose-project-difficulty',
    question: 'How do I choose a project difficulty?',
    answer:
      'Pick a project that uses skills you already understand while introducing one or two new concepts. If you cannot explain the basic approach, simplify the project before adding more features.',
    followUps: ['project-to-build'],
  },
  {
    id: 'build-project-without-team',
    question: 'Can I build projects without a team?',
    answer:
      'Yes! Start with a manageable individual project, divide it into small tasks, and build one feature at a time. Use Git to track your changes and document your progress.',
    followUps: ['start-first-project'],
  },
  {
    id: 'debug-project-errors',
    question: 'How do I debug project errors?',
    answer:
      'Read the error message carefully, reproduce the problem, and identify which part of your code causes it. Test one possible fix at a time and consult documentation when needed.',
    followUps: ['improve-existing-project'],
  },
  {
    id: 'write-project-documentation',
    question: 'How do I write project documentation?',
    answer:
      "Create a README explaining the project's purpose, features, technology stack, setup instructions, usage, and screenshots or demo link. Include any important limitations and acknowledge external resources where appropriate.",
    followUps: ['project-readme-contents'],
  },
  {
    id: 'upload-project-github',
    question: 'How do I upload my project to GitHub?',
    answer:
      'Create a repository, initialise Git if needed, commit your project files, and push them to GitHub. Check your .gitignore and never upload API keys, passwords, .env files, or private data.',
    followUps: ['project-readme-contents'],
  },
  {
    id: 'deploy-project-online',
    question: 'How do I deploy my project online?',
    answer:
      'Choose a hosting platform suitable for your technology stack, configure the required build settings and environment variables, and test the deployed application. Keep secrets on the server rather than exposing them in frontend code.',
    followUps: ['make-project-unique'],
  },
  {
    id: 'improve-existing-project',
    question: 'How do I improve an existing project?',
    answer:
      'Start by identifying a real limitation, such as poor usability, missing validation, slow performance, or incomplete features. Fix the most important issue first, then test the improvement.',
    followUps: ['debug-project-errors'],
  },
  {
    id: 'make-project-unique',
    question: 'How do I make my project unique?',
    answer:
      'Understand the problem your project solves and identify what existing solutions do not address well. Add a meaningful improvement, such as a better workflow, accessibility, useful analytics, or reliable error handling.',
    followUps: ['turn-idea-into-product'],
  },
  {
    id: 'project-readme-contents',
    question: 'What should my project README contain?',
    answer:
      'Include a project overview, key features, technology stack, installation steps, configuration requirements, usage instructions, screenshots or demo links, and contribution details where relevant.',
    followUps: ['upload-project-github'],
  },
  {
    id: 'explain-project-in-interviews',
    question: 'How do I explain my project in interviews?',
    answer:
      'Explain the problem, your approach, the technology choices, your individual contribution, and the challenges you solved. Be ready to discuss trade-offs and demonstrate the working project.',
    followUps: ['prepare-interviews'],
  },
  {
    id: 'turn-idea-into-product',
    question: 'How do I turn an idea into a working product?',
    answer:
      'Write down the problem and intended users, define the minimum useful features, build a small prototype, and test it. Improve the product using feedback rather than trying to build everything at once.',
    followUps: ['start-first-project'],
  },
  {
    id: 'find-fresher-jobs',
    question: 'How do I find fresher job opportunities?',
    answer:
      'Check company career pages, reputable job portals, internship listings, and your college placement resources. Tailor your resume to relevant roles, maintain a portfolio, and track the applications you submit.',
    followUps: ['prepare-campus-placements'],
  },
  {
    id: 'prepare-aptitude-tests',
    question: 'How do I prepare for aptitude tests?',
    answer:
      'Practise quantitative aptitude, logical reasoning, and verbal ability according to the test syllabus. Solve timed questions, review mistakes, and focus on improving accuracy before increasing speed.',
    followUps: ['prepare-technical-round'],
  },
  {
    id: 'answer-hr-questions',
    question: 'How do I answer HR questions?',
    answer:
      'Prepare concise, honest answers about your background, strengths, goals, projects, and challenges. Use specific examples where possible, and practise speaking naturally instead of memorising entire scripts.',
    followUps: ['improve-communication'],
  },
  {
    id: 'explain-college-projects',
    question: 'How do I explain my college projects?',
    answer:
      'Describe the problem, your solution, the technologies used, and what you personally contributed. Explain one technical challenge you faced and how you solved it.',
    followUps: ['explain-project-in-interviews'],
  },
  {
    id: 'portfolio-contents',
    question: 'What should I include in my portfolio?',
    answer:
      'Include relevant projects, a short introduction, your technical skills, project descriptions, and links to working demos or GitHub repositories. Keep the content organised and ensure every link works.',
    followUps: ['first-portfolio'],
  },
  {
    id: 'prepare-technical-round',
    question: 'How do I prepare for a technical round?',
    answer:
      'Review the fundamentals of your target role, practise problem-solving questions, and understand the projects listed on your resume. Practise explaining your reasoning, not just giving the final answer.',
    followUps: ['prepare-interviews'],
  },
  {
    id: 'apply-without-internship',
    question: 'How do I apply without internship experience?',
    answer:
      'Apply for suitable fresher roles and internships that accept candidates without prior experience. Highlight relevant projects, coursework, practical skills, and evidence of independent learning.',
    followUps: ['showcase-projects'],
  },
  {
    id: 'improve-communication',
    question: 'How do I improve my communication skills?',
    answer:
      'Practise explaining technical concepts in simple language, summarising your projects aloud, and answering common interview questions. Record yourself occasionally and work on clarity, structure, and confidence.',
    followUps: ['answer-hr-questions'],
  },
  {
    id: 'handle-interview-rejection',
    question: 'How do I handle interview rejection?',
    answer:
      'Give yourself time to process the disappointment, review any feedback, and identify one area to improve. Continue practising and applying to suitable roles. A rejection does not automatically mean you lack ability.',
    followUps: ['improve-next'],
  },
  {
    id: 'prepare-campus-placements',
    question: 'How do I prepare for campus placements?',
    answer:
      "Prepare your resume, practise aptitude and technical questions, revise your core subjects, and rehearse HR interviews. Keep your projects ready to demonstrate and check your college's placement requirements.",
    followUps: ['prepare-technical-round'],
  },
  {
    id: 'use-without-account',
    question: 'Can I use Pathwise without an account?',
    answer:
      'Yes! Pathwise is designed to be accessible without requiring login. You can use the available features directly, subject to the current implementation.',
    followUps: ['how-use-pathwise'],
  },
  {
    id: 'pathwise-free-to-use',
    question: 'Is Pathwise free to use?',
    answer:
      'Yes, Pathwise is intended to be a free career guidance platform. No paid subscription is required to use its intended free features.',
    followUps: ['what-can-pathwise-do'],
  },
  {
    id: 'uploaded-resume-handling',
    question: 'What happens to my uploaded resume?',
    answer:
      "Resume handling depends on Pathwise's current implementation and its AI-processing workflow. Review the privacy information before uploading sensitive information, and avoid including details that are unnecessary for analysis.",
    followUps: ['resume-data-safe'],
  },
  {
    id: 'file-not-uploading',
    question: 'Why is my file not uploading?',
    answer:
      'Check that your file uses a supported format, meets the size limit, and is not damaged or password-protected. If the problem continues, try another readable copy of your resume.',
    followUps: ['file-formats-supported'],
  },
  {
    id: 'analysis-failed',
    question: 'Why did my analysis fail?',
    answer:
      'Analysis may fail if the file cannot be parsed, the extracted text is insufficient, or the AI service encounters an error. Check your file and try again later if the service is temporarily unavailable.',
    followUps: ['file-not-uploading'],
  },
  {
    id: 'score-looks-incorrect',
    question: 'What if my score looks incorrect?',
    answer:
      'Review the scoring criteria and the evidence extracted from your resume. Check whether important information was missed or parsed incorrectly. Treat the score as an indicator for improvement, not an absolute measure of your abilities.',
    followUps: ['improve-resume'],
  },
  {
    id: 'download-roadmap',
    question: 'Can I download my roadmap?',
    answer:
      'If roadmap PDF export is available in your current version, use the download option on the roadmap page. If it is missing, check whether the feature has been implemented in your build.',
    followUps: ['use-skills-roadmap'],
  },
  {
    id: 'report-technical-issue',
    question: 'How do I report a technical issue?',
    answer:
      'Try reproducing the issue and note what you were doing when it occurred. Avoid sharing API keys, passwords, or private resume data in screenshots or reports. Use the available feedback or contact option if one is provided.',
    followUps: ['analysis-failed'],
  },
  {
    id: 'file-formats-supported',
    question: 'What file formats are supported?',
    answer:
      'Pathwise accepts genuine PDF, DOC, and DOCX resume files up to 5 MB. It checks the extension, reported file type, and actual file content before analysis.',
    followUps: ['file-not-uploading'],
  },
  {
    id: 'use-skills-roadmap',
    question: 'How do I use my skills roadmap?',
    answer:
      'Follow the roadmap in order, work through each priority skill, and complete the suggested practice or project tasks. Track your progress and re-upload your updated resume when you have new evidence to add.',
    followUps: ['track-progress'],
  },
]

export const CHAT_QUESTIONS = [
  ...CORE_CHAT_QUESTIONS,
  ...EXPANDED_CHAT_QUESTIONS,
]

export const CHAT_CATEGORY_BY_ID = Object.fromEntries(
  CHAT_CATEGORIES.map((category) => [category.id, category]),
)

export const CHAT_QUESTION_BY_ID = Object.fromEntries(
  CHAT_QUESTIONS.map((question) => [question.id, question]),
)
