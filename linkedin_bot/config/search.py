
###################################################### LINKEDIN SEARCH PREFERENCES ######################################################

# These Sentences are Searched in LinkedIn
# Enter your search terms inside '[ ]' with quotes ' "searching title" ' for each search followed by comma ', ' Eg: ["Software Engineer", "Software Developer", "Selenium Developer"]
search_terms = [
    "AI Engineer", "ML Engineer", "Machine Learning Engineer", "LLM Engineer", "AI/ML Engineer", "Generative AI Engineer",
    "Deep Learning Engineer", "NLP Engineer", "Computer Vision Engineer", "MLOps Engineer",
    "Applied Scientist", "Research Scientist", "Data Scientist", "Prompt Engineer",
    "AI Research Engineer", "Foundation Model Engineer", "AI Software Engineer",
]

# Search location, this will be filled in "City, state, or zip code" search box. If left empty as "", tool will not fill it.
search_location = "United States"               # Some valid examples: "", "United States", "India", "Chicago, Illinois, United States", "90001, Los Angeles, California, United States", "Bengaluru, Karnataka, India", etc.

# After how many number of applications in current search should the bot switch to next search? 
switch_number = 2                  # Only numbers greater than 0... Don't put in quotes

# Do you want to randomize the search order for search_terms?
randomize_search_order = False     # True of False, Note: True or False are case-sensitive


# >>>>>>>>>>> Job Search Filters <<<<<<<<<<<
''' 
You could set your preferences or leave them as empty to not select options except for 'True or False' options. Below are some valid examples for leaving them empty:
This is below format: QUESTION = VALID_ANSWER

## Examples of how to leave them empty. Note that True or False options cannot be left empty! 
* question_1 = ""                    # answer1, answer2, answer3, etc.
* question_2 = []                    # (multiple select)
* question_3 = []                    # (dynamic multiple select)

## Some valid examples of how to answer questions:
* question_1 = "answer1"                  # "answer1", "answer2", "answer3" or ("" to not select). Answers are case sensitive.
* question_2 = ["answer1", "answer2"]     # (multiple select) "answer1", "answer2", "answer3" or ([] to not select). Note that answers must be in [] and are case sensitive.
* question_3 = ["answer1", "Random AnswER"]     # (dynamic multiple select) "answer1", "answer2", "answer3" or ([] to not select). Note that answers must be in [] and need not match the available options.

'''

sort_by = "Most recent"            # "Most recent", "Most relevant" or ("" to not select)
                                   # NOTE: search_jobs.py cycles through BOTH sort orders automatically
date_posted = "Any time"           # "Any time", "Past month", "Past week", "Past 24 hours" or ("" to not select)
                                   # NOTE: search_jobs.py cycles through ALL date ranges automatically
salary = ""                        # "$40,000+", "$60,000+", "$80,000+", "$100,000+", "$120,000+", "$140,000+", "$160,000+", "$180,000+", "$200,000+" or ("" for no filter)

easy_apply_only = True             # True or False — always kept ON

# ── From JOBEZEE profile: experience_level = "mid" ───────────────────────────
experience_level = ["Entry level", "Associate", "Mid-Senior level"]
                                   # (multiple select) "Internship", "Entry level", "Associate", "Mid-Senior level", "Director", "Executive"

# ── From JOBEZEE profile: job_type = "full_time" ─────────────────────────────
job_type = ["Full-time"]           # (multiple select) "Full-time", "Part-time", "Contract", "Temporary", "Volunteer", "Internship", "Other"

# ── From JOBEZEE profile: remote_preference = "hybrid" ───────────────────────
on_site = ["On-site", "Remote", "Hybrid"]  # (multiple select) "On-site", "Remote", "Hybrid"

companies = []                     # (dynamic multiple select) Leave empty or add target companies
                                   # e.g. ["Google", "NVIDIA", "Apple", "Microsoft", "OpenAI"]

# ── From JOBEZEE profile: preferred_locations ────────────────────────────────
location = []                      # (dynamic multiple select) e.g. ["Chicago, IL", "Remote", "San Francisco, CA"]

# ── From JOBEZEE profile: industries ─────────────────────────────────────────
industry = [
    "Software Development",
    "IT Services and IT Consulting",
    "Technology, Information and Internet",
    "Technology, Information and Media",
    "Computers and Electronics Manufacturing",
    "Information Services",
]                                  # (dynamic multiple select)

# ── Job function ──────────────────────────────────────────────────────────────
job_function = ["Information Technology", "Engineering", "Research"]
                                   # (dynamic multiple select) "Information Technology", "Engineering", "Research", "Consulting", etc.

# ── Title filter (LinkedIn modal) — also filtered in code via title_keywords ──
job_titles = ["Artificial Intelligence Engineer", "Machine Learning Engineer", "Applied Machine Learning Engineer"]
                                   # (dynamic multiple select)

benefits = []                      # (dynamic multiple select) e.g. ["Medical insurance", "401(k)", "Dental insurance"]
commitments = []                   # (dynamic multiple select) e.g. ["Career growth and learning", "Work-life balance"]

under_10_applicants = False        # True or False
in_your_network = False            # True or False
fair_chance_employer = False       # True or False

# ──────────────────────────────────────────────────────────────────────────────
# JOBEZEE INTEGRATION (future) — when JOBEZEE backend is ready, this section
# will be auto-populated from the user's profile API response:
#
#   profile.experience_level  → experience_level mapping
#   profile.job_type          → job_type mapping
#   profile.remote_preference → on_site mapping
#   profile.salary_min        → salary filter
#   profile.preferred_locations → location
#   profile.industries        → industry
#   profile.desired_roles     → search_terms
# ──────────────────────────────────────────────────────────────────────────────


## >>>>>>>>>>> RELATED SETTING <<<<<<<<<<<

# Pause after applying filters to let you modify the search results and filters?
pause_after_filters = False        # True or False, Note: True or False are case-sensitive

##




## >>>>>>>>>>> TITLE FILTER <<<<<<<<<<<

# Skip jobs whose title does NOT contain at least one of these keywords. Leave empty [] to disable.
title_keywords = [
    "AI", "ML", "Machine Learning", "LLM", "Generative", "NLP", "Deep Learning", "Applied AI", "AI/ML", "Artificial Intelligence",
    "Data Scientist", "Applied Scientist", "Research Scientist", "Computer Vision", "Prompt Engineer",
    "Foundation Model", "MLOps", "AI Research",
]

##


## >>>>>>>>>>> SKIP IRRELEVANT JOBS <<<<<<<<<<<
 
# Avoid applying to these companies, and companies with these bad words in their 'About Company' section...
about_company_bad_words = ["Crossover"]       # (dynamic multiple search) or leave empty as []. Ex: ["Staffing", "Recruiting", "Name of Company you don't want to apply to"]

# Skip checking for `about_company_bad_words` for these companies if they have these good words in their 'About Company' section... [Exceptions, For example, I want to apply to "Robert Half" although it's a staffing company]
about_company_good_words = []      # (dynamic multiple search) or leave empty as []. Ex: ["Robert Half", "Dice"]

# Avoid applying to these companies if they have these bad words in their 'Job Description' section...  (In development)
bad_words = []                     # (dynamic multiple search) or leave empty as []. Case Insensitive. Ex: ["word_1", "phrase 1", "word word", "polygraph", "US Citizenship", "Security Clearance"]

# Do you have an active Security Clearance? (True for Yes and False for No)
security_clearance = False         # True or False, Note: True or False are case-sensitive

# Do you have a Masters degree? (True for Yes and False for No). If True, the tool will apply to jobs containing the word 'master' in their job description and if it's experience required <= current_experience + 2 and current_experience is not set as -1. 
did_masters = False                # True or False, Note: True or False are case-sensitive

# Avoid applying to jobs if their required experience is above your current_experience. (Set value as -1 if you want to apply to all ignoring their required experience...)
current_experience = 5             # Integers > -2 (Ex: -1, 0, 1, 2, 3, 4...)
##