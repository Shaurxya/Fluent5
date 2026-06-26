-- FluentFive Seed Data

-- 5 Activities
INSERT INTO activities (key, title, description, position) VALUES
  ('shadow', 'Shadowing', 'Listen to a model sentence, record yourself, and compare your pronunciation.', 1),
  ('speak', 'Speak & Think Out Loud', 'Respond to a prompt for 2 minutes while your speech is transcribed live.', 2),
  ('read', 'Active Reading + Chunks', 'Read a passage, save useful phrases, and explore definitions.', 3),
  ('write', 'Write & Rewrite', 'Write a draft, check grammar & style, then polish your rewrite.', 4),
  ('review', 'Spaced Repetition Review', 'Review your saved chunks with flashcards using spaced repetition.', 5);

-- Shadowing Sentences (Easy)
INSERT INTO sentences (level, text) VALUES
  ('easy', 'The weather is beautiful today.'),
  ('easy', 'I would like a cup of coffee, please.'),
  ('easy', 'She goes to the park every morning.'),
  ('easy', 'Can you help me find the library?'),
  ('easy', 'We had a wonderful time at the beach.'),
  ('easy', 'He reads a book before going to sleep.'),
  ('easy', 'The children are playing in the garden.'),
  ('easy', 'I need to buy some groceries after work.'),
  ('easy', 'Thank you for your help with this project.'),
  ('easy', 'The train arrives at the station at nine o''clock.');

-- Shadowing Sentences (Medium)
INSERT INTO sentences (level, text) VALUES
  ('med', 'Despite the heavy rain, they decided to continue their hike through the forest.'),
  ('med', 'The conference was attended by experts from more than twenty different countries.'),
  ('med', 'She has been working on this research project for almost three years now.'),
  ('med', 'If I had known about the traffic, I would have left the house much earlier.'),
  ('med', 'The documentary explores how technology has transformed the way we communicate.'),
  ('med', 'He apologized for the misunderstanding and offered to make it right.'),
  ('med', 'The restaurant on the corner serves the best Italian food in the neighborhood.'),
  ('med', 'Learning a new language requires consistent practice and a lot of patience.'),
  ('med', 'The company announced plans to expand its operations into three new markets.'),
  ('med', 'She was surprised to discover that the museum was offering free admission all week.');

-- Shadowing Sentences (Hard)
INSERT INTO sentences (level, text) VALUES
  ('hard', 'The unprecedented economic downturn has prompted governments worldwide to implement extraordinary fiscal measures to stabilize their financial systems.'),
  ('hard', 'Notwithstanding the substantial challenges posed by climate change, renewable energy technologies have demonstrated remarkable progress in efficiency and affordability.'),
  ('hard', 'The philosophical implications of artificial intelligence raise fundamental questions about consciousness, autonomy, and what it truly means to be human.'),
  ('hard', 'Having meticulously analyzed the experimental data, the researchers concluded that the correlation between the two variables was statistically insignificant.'),
  ('hard', 'The architectural masterpiece, which took over a decade to complete, seamlessly integrates sustainable design principles with breathtaking aesthetic innovation.'),
  ('hard', 'Contemporary neuroscience suggests that the brain''s neuroplasticity allows for continuous adaptation and learning throughout the entire span of human life.'),
  ('hard', 'The geopolitical ramifications of the trade agreement extend far beyond economics, fundamentally reshaping diplomatic relationships across the entire region.'),
  ('hard', 'While the theoretical framework provides a comprehensive foundation, its practical application requires nuanced understanding of contextual variables and stakeholder dynamics.'),
  ('hard', 'The interdisciplinary approach to urban planning incorporates insights from sociology, environmental science, and behavioral economics to create more livable cities.'),
  ('hard', 'Critically examining the historical narrative reveals a more complex and multifaceted reality than what is conventionally portrayed in mainstream textbooks.');

-- Reading Passages
INSERT INTO passages (title, body, level) VALUES
  ('The Power of Habits', 'Habits shape our daily lives more than we realize. Research shows that nearly 40% of our everyday actions are driven by habits rather than conscious decisions. A habit loop consists of three components: a cue, a routine, and a reward. The cue triggers the behavior, the routine is the action itself, and the reward is what reinforces the loop.

Understanding this loop is the key to changing unwanted habits and building new ones. To create a new habit, start by identifying a clear cue — perhaps a specific time of day or an existing routine. Then, define the new behavior you want to adopt and attach a meaningful reward to it.

Consistency is crucial in the early stages. Research suggests it takes an average of 66 days for a new behavior to become automatic. During this period, tracking your progress and celebrating small wins can significantly increase your chances of success. Remember, the goal is not perfection but persistence.', 'easy'),

  ('The Science of Sleep', 'Sleep is one of the most important yet often overlooked aspects of health. During sleep, the brain consolidates memories, repairs cells, and clears toxic waste products that accumulate during waking hours. Adults typically need between seven and nine hours of sleep per night for optimal functioning.

The sleep cycle consists of several stages, including light sleep, deep sleep, and REM (rapid eye movement) sleep. Each stage serves a distinct purpose. Deep sleep is essential for physical recovery and immune function, while REM sleep plays a crucial role in emotional regulation and creative problem-solving.

Modern society poses numerous threats to healthy sleep patterns. Blue light from screens suppresses melatonin production, caffeine consumed too late in the day can delay sleep onset, and irregular schedules disrupt the body''s circadian rhythm. Establishing a consistent bedtime routine, limiting screen exposure before bed, and creating a cool, dark sleeping environment are evidence-based strategies for improving sleep quality.', 'med'),

  ('Digital Minimalism', 'In an era of constant connectivity, digital minimalism offers a philosophy of technology use that prioritizes intentionality over convenience. Coined by computer scientist Cal Newport, the term describes a deliberate approach to choosing which digital tools and platforms deserve your time and attention.

The core principle is simple: technology should serve your values, not the other way around. This means critically evaluating each app, platform, and digital habit to determine whether it genuinely adds value to your life. If it doesn''t, it should be eliminated or significantly reduced.

Practitioners of digital minimalism often report unexpected benefits. They describe deeper conversations, increased creativity, reduced anxiety, and a stronger sense of presence in their daily lives. The practice doesn''t require abandoning technology entirely but rather cultivating a more thoughtful and selective relationship with the digital world.

Starting your own digital minimalism practice can begin with a simple 30-day experiment: remove all optional technology from your life, then gradually reintroduce only the tools that pass a strict value test.', 'med'),

  ('The Art of Deep Work', 'Deep work, a concept popularized by productivity expert Cal Newport, refers to the ability to focus without distraction on a cognitively demanding task. In our increasingly connected world, this skill is becoming both rarer and more valuable simultaneously.

The modern knowledge economy rewards those who can produce at an elite level, and elite production requires deep, sustained concentration. Yet most professionals spend their days in a state of shallow work — answering emails, attending meetings, and responding to instant messages — activities that feel productive but rarely move the needle on important projects.

Training your capacity for deep work requires treating it like a muscle. Start with short focused sessions of 30 to 60 minutes and gradually extend them. Create rituals around your deep work: a specific location, a particular beverage, a consistent time of day. These environmental cues help your brain transition into a focused state more quickly.

Equally important is learning to embrace boredom. If you reach for your phone every time you have a moment of downtime, you''re training your brain to expect constant stimulation, making sustained concentration increasingly difficult.', 'hard'),

  ('The Future of Language Learning', 'Language learning has undergone a remarkable transformation in the digital age. Traditional methods that relied heavily on grammar drills and vocabulary memorization are being supplemented — and in some cases replaced — by approaches that prioritize authentic communication and immersive experiences.

Research in second language acquisition consistently shows that comprehensible input is the single most important factor in language learning. This means exposure to language that is slightly above the learner''s current level, delivered in a meaningful context. Podcasts, videos, and conversation with native speakers all provide rich sources of comprehensible input.

Spaced repetition systems have emerged as one of the most effective tools for vocabulary acquisition. By presenting words and phrases at increasing intervals just before they would be forgotten, these systems exploit the spacing effect — a well-documented phenomenon in cognitive psychology that demonstrates how distributed practice leads to more durable memories than massed practice.

However, technology alone cannot replace the human elements of language learning. The emotional connection formed through real conversations, the cultural insights gained through authentic interaction, and the motivation derived from genuine communication remain irreplaceable components of the language acquisition process.', 'hard');

-- Quiz Questions
INSERT INTO quiz_questions (level, prompt, options, answer_index) VALUES
  ('easy', 'Choose the correct form: "She ___ to the store every day."', '["go","goes","going","gone"]', 1),
  ('easy', 'Which sentence is correct?', '["He don''t like coffee.","He doesn''t likes coffee.","He doesn''t like coffee.","He not like coffee."]', 2),
  ('easy', 'Fill in the blank: "I have been living here ___ five years."', '["since","for","from","during"]', 1),
  ('easy', 'Choose the correct word: "There are ___ apples on the table."', '["much","a","some","an"]', 2),
  ('easy', 'Which is the past tense of ''begin''?', '["beginned","began","begun","beginned"]', 1),
  ('med', 'Choose the correct option: "If I ___ rich, I would travel the world."', '["am","was","were","be"]', 2),
  ('med', 'Which sentence uses the correct preposition?', '["She arrived to the airport.","She arrived at the airport.","She arrived in the airport.","She arrived on the airport."]', 1),
  ('med', 'Fill in the blank: "Not only ___ intelligent, but she is also hardworking."', '["she is","is she","she was","was she"]', 1),
  ('med', 'Choose the best word: "The project was completed ___ schedule."', '["in","before","ahead of","prior"]', 2),
  ('med', 'Which sentence is grammatically correct?', '["Neither the teacher nor the students was ready.","Neither the teacher nor the students were ready.","Neither the teacher nor the students are ready.","Neither the teacher nor the students is ready."]', 1),
  ('med', 'Select the correct relative pronoun: "The book ___ I borrowed was fascinating."', '["who","whom","which","what"]', 2),
  ('hard', 'Choose the correct form: "Had I ___ about the meeting, I would have attended."', '["know","knew","known","knowing"]', 2),
  ('hard', 'Which sentence demonstrates correct parallel structure?', '["She likes swimming, to run, and cycling.","She likes swimming, running, and cycling.","She likes to swim, running, and to cycle.","She likes swim, run, and cycle."]', 1),
  ('hard', 'Fill in the blank: "The data ___ inconclusive at this stage."', '["are","is","were","has been"]', 0),
  ('hard', 'Choose the most appropriate word: "The committee reached a ___ decision after lengthy deliberation."', '["anonymous","unanimous","ambiguous","simultaneous"]', 1),
  ('hard', 'Which sentence correctly uses the subjunctive mood?', '["I suggest that he goes to the doctor.","I suggest that he go to the doctor.","I suggest that he went to the doctor.","I suggest that he will go to the doctor."]', 1),
  ('hard', 'Select the correct option: "___  the circumstances, we decided to postpone the event."', '["Giving","Given","Gave","Having gave"]', 1),
  ('hard', 'Choose the sentence with the correct use of a semicolon.', '["She was tired; and she went to bed early.","She was tired; she went to bed early.","She was tired; because she went to bed early.","She was tired; but she went to bed early."]', 1),
  ('hard', 'Fill in the blank: "The phenomenon, ___ had been observed previously, warranted further investigation."', '["that","who","which","what"]', 2),
  ('hard', 'Which word best completes: "The evidence is largely ___, making it difficult to draw definitive conclusions."', '["anecdotal","antidotal","ancestral","analytical"]', 0);
