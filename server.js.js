const express = require('express');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// System prompt to enforce interviewer personality and output behavior
const SYSTEM_PROMPT = `You are an expert AI HR Interviewer for HGP CareerCheck AI by HRD, evaluating candidates for hotel positions.
Rule 1: Be polite, professional, and realistic for hospitality interviews.
Rule 2: Respond in the exact language the candidate uses (English, Bangla, or Banglish).
Rule 3: Keep responses concise (1-2 sentences acknowledging/following up + 1 clear question).
Rule 4: Adapt question difficulty based on whether candidate indicates being a fresher or experienced.
Rule 5: Focus on hotel operations, guest service, problem-solving, situational handling, and technical role knowledge.`;

app.post('/api/chat', async (req, res) => {
  try {
    const { history, department, position } = req.body;

    const contents = [
      { role: 'user', parts: [{ text: `[SYSTEM CONTEXT: Candidate applying for Department: ${department}, Position: ${position}]` }] },
      ...history.map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }))
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ error: 'Failed to process AI interview query.' });
  }
});

app.post('/api/evaluate', async (req, res) => {
  try {
    const { history, department, position } = req.body;

    const evalPrompt = `Analyze the following job interview transcript for a hotel position and return ONLY a valid JSON object matching the requested schema.

Department: ${department}
Position: ${position}

Transcript:
${JSON.stringify(history, null, 2)}

Strict Criteria:
1. Do not judge race, age, gender, religion, background, or protected traits.
2. Evaluate purely on: Communication, Hospitality Mindset, Problem Solving, Technical Knowledge, Professionalism, Situational Judgement, Guest Handling, Language Communication.
3. Return ONLY JSON without markdown formatting or code blocks.

Target JSON Structure:
{
  "overallScore": 85,
  "careerReadiness": "Job Ready / Needs Minor Improvement / Requires Training",
  "competencies": {
    "communication": 80,
    "hospitalityMindset": 90,
    "problemSolving": 75,
    "technicalKnowledge": 85,
    "professionalism": 90,
    "situationalJudgement": 80,
    "guestHandling": 85,
    "languageCommunication": 80
  },
  "strengths": ["Point 1", "Point 2", "Point 3"],
  "areasToImprove": ["Area 1", "Area 2"],
  "bestFitRoles": ["Role 1", "Role 2"],
  "recommendation": "Strongly Recommend" | "Consider for Interview" | "Not Recommended",
  "assessmentSummary": "A short, 2-3 sentence professional HR summary of performance and potential."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: evalPrompt }] }],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const resultData = JSON.parse(response.text);
    res.json(resultData);
  } catch (error) {
    console.error('Evaluation Error:', error);
    res.status(500).json({ error: 'Failed to generate interview assessment.' });
  }
});

app.listen(PORT, () => {
  console.log(`HGP CareerCheck AI running on port ${PORT}`);
});