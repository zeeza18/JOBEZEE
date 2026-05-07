// Paste this entire block into the browser console while on localhost:5174
// Then navigate to /profile-boost (or wherever the LinkedIn Boost page lives)
// It loads the analyzed state without needing a real PDF upload.

localStorage.setItem('jobezee_linkedin_boost', JSON.stringify({
  phase: 'analyzed',
  targetRole: 'AI/ML Engineer',
  optimizeResult: null,
  result: {
    overall_score: 83,
    grade: 'Excellent',
    overall_verdict: 'AI/ML Engineer with exceptional technical depth in production GenAI systems, strong quantified achievements at JPMorgan Chase, and comprehensive tool coverage across LLM orchestration, RAG, and MLOps—needing only visual polish and social proof to reach elite status.',
    jd_fit_score: 0,
    top_strengths: [
      'Exceptional keyword density for AI/ML Engineer role with 7+ appearances across sections',
      'Strong quantified achievements: 28% retrieval precision, 18% F1 improvement, latency reduced from 1.8s to 1.3s',
      'Comprehensive tool stack coverage including RAG, Multi-Agent, LLM orchestration, MLOps across all major cloud platforms',
    ],
    top_gaps: [
      'No LinkedIn recommendations, only 1 certification - missing social proof that hiring managers expect',
      'No cover banner - major visual gap despite strong photo quality (80/100)',
      'No GitHub, portfolio links, or project showcases - limits credibility for technical roles',
    ],
    buckets: [
      { id: 'headline',      label: 'Headline',      score: 16, max: 20, pct: 80, evaluated: true,
        strengths: ['Includes current company and role title'],
        gaps: ['Missing years of experience or a key achievement metric'] },
      { id: 'about',         label: 'About / Summary', score: 18, max: 20, pct: 90, evaluated: true,
        strengths: ['Strong opening with quantified impact', 'Covers all major skills'],
        gaps: ['No call-to-action or contact invitation'] },
      { id: 'experience',    label: 'Experience',    score: 19, max: 20, pct: 95, evaluated: true,
        strengths: ['Every role has quantified bullets', 'Progressive career trajectory'],
        gaps: ['Oldest role missing impact metrics'] },
      { id: 'skills',        label: 'Skills',        score: 14, max: 15, pct: 93, evaluated: true,
        strengths: ['Top skills match target role perfectly'],
        gaps: ['Could reorder to put RAG and LLM skills first'] },
      { id: 'completeness',  label: 'Completeness',  score: 10, max: 15, pct: 67, evaluated: true,
        strengths: ['3 jobs listed, education complete'],
        gaps: ['Only 1 certification', 'No recommendations', 'No portfolio/GitHub link'] },
      { id: 'visual',        label: 'Visual',         score: 4,  max: 10, pct: 40, evaluated: true,
        strengths: ['Profile photo is professional quality'],
        gaps: ['No cover banner (0/100)', 'Missing custom URL'] },
    ],
    priority_fixes: [
      { section: 'visual', impact: 'High',
        issue: 'No cover banner (scored 0/100) while photo scored 80/100',
        fix: 'Create a professional banner with role title (AI/ML Engineer), key skills (RAG, LLM, Multi-Agent), and company name (JPMorgan Chase). Use consistent branding colors. Canva offers LinkedIn banner templates.' },
      { section: 'proof', impact: 'High',
        issue: 'No LinkedIn recommendations or endorsements visible',
        fix: 'Request recommendations from managers or colleagues at JPMorgan Chase and HCLTech. Ask for skill endorsements for top skills.' },
      { section: 'proof', impact: 'Medium',
        issue: 'Only 1 certification listed',
        fix: 'Add relevant certifications: AWS Certified Machine Learning Specialty, Google Cloud Professional ML Engineer, or DeepLearning.AI courses on Coursera.' },
      { section: 'proof', impact: 'Medium',
        issue: 'No GitHub or portfolio links',
        fix: 'Add a GitHub link showcasing production projects (RAG pipelines, multi-agent systems) or create a personal site with case studies.' },
      { section: 'headline', impact: 'Low',
        issue: 'Headline lacks years of experience or a key achievement metric',
        fix: "Consider: 'AI/ML Engineer @ JPMorgan | RAG • Multi-Agent AI • LLM | 28% Precision Gains | Production GenAI on AWS/GCP/Azure'" },
    ],
    headline_rewrite: {
      current: 'AI Engineer at JPMorgan Chase',
      improved: 'AI/ML Engineer @ JPMorgan | RAG • Multi-Agent AI • LLM | 28% Precision Gains | Production GenAI on AWS/GCP/Azure',
      reason: 'Adding metrics and stack keywords makes you appear in more recruiter searches and signals seniority.',
    },
    about_tips: [
      'Open with a one-line value statement that names your niche and a top metric.',
      'End with a clear call-to-action: "Open to Staff/Principal AI Engineer roles."',
    ],
    visual_notes: [],
    profile_image: null,
    cover_image: null,
    parsed_sections: {
      headline: 'AI Engineer | LLM • RAG • Multi-Agent | Production GenAI @ JPMorgan Chase',
      about: 'Results-driven AI/ML Engineer with 5+ years building production-grade GenAI systems across LLM orchestration, RAG pipelines, and multi-agent automation. Currently architecting enterprise AI infrastructure at JPMorgan Chase processing millions of queries daily. Passionate about turning cutting-edge research into measurable business outcomes.',
      experience: [
        // Entry 0: header (no date)
        'JPMorgan Chase & Co | AI Engineer',
        // Entry 1: date block + trailing next company header
        'April 2025 - Present (1 year 2 months) | United States | \u25b8 Architected production RAG pipelines using LlamaIndex, FAISS, and Pinecone, improving retrieval precision by ~28% measured via automated evaluation benchmarks. | \u25b8 Optimized AWS SageMaker inference endpoints with BentoML request batching, reducing average response latency from 1.8s to 1.3s across production query workloads. | \u25b8 Built multi-agent AI systems using AutoGen and CrewAI automating document processing and data extraction workflows. | \u25b8 Designed end-to-end ML deployment infrastructure with Kubernetes, Docker, and Terraform enabling reproducible, scalable, zero-downtime model releases. | HCLTech | Artificial Intelligence Engineer',
        // Entry 2: date block for HCLTech
        'June 2023 - November 2023 (6 months) | India | \u25b8 Fine-tuned transformer-based NLP models for text classification and named entity recognition — improved F1 score by ~18% over BERT baseline on production data. | \u25b8 Built semantic search pipelines using Sentence Transformers and FAISS integrated into internal knowledge retrieval tools. | \u25b8 Deployed NLP models on Azure ML managed endpoints with automated performance monitoring and drift detection. | Tech Mahindra | Machine Learning Engineer',
        // Entry 3: date block for Tech Mahindra
        'December 2020 - May 2022 (1 year 6 months) | India | \u25b8 Engineered supervised ML models for customer churn prediction and product classification deployed on GCP Vertex AI with managed hyperparameter tuning. | \u25b8 Built collaborative filtering recommendation system serving personalized predictions at scale. | \u25b8 Developed Python and Apache Spark feature engineering pipelines for large-scale structured data preprocessing.',
      ],
      skills: [
        'Python, PyTorch, TensorFlow, HuggingFace Transformers, LangChain, LlamaIndex,',
        'RAG, Multi-Agent Systems, AutoGen, CrewAI, FAISS, Pinecone, Weaviate,',
        'AWS SageMaker, GCP Vertex AI, Azure ML, Kubernetes, Docker, Terraform,',
        'MLflow, BentoML, FastAPI, PostgreSQL, Redis',
      ],
      education: [
        'DePaul University',
        '\u00b7 (January 2024 - December 2026)',
        'University of Mumbai \u2014 BTech Computer Engineering, 2020',
      ],
      has_recommendations: false,
    },
    pdf_text: '',
  }
}));

console.log('%c✅ Mock boost data injected — refresh/navigate to the Profile Boost page', 'color:green;font-weight:bold');
