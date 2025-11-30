import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// --- 1. CONFIGURATION & UTILS ---

const getEnv = (key: string): string => {
  let value = '';
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      value = import.meta.env[`VITE_${key}`] || import.meta.env[key];
    }
  } catch (e) { /* ignore */ }

  if (!value) {
    try {
      // @ts-ignore
      if (typeof process !== 'undefined' && process.env) {
        // @ts-ignore
        value = process.env[`REACT_APP_${key}`] || process.env[key];
      }
    } catch (e) { /* ignore */ }
  }
  return value || '';
};

const RESEARCHER_EMAIL = "penghann@hotmail.com";
const API_KEY = getEnv('API_KEY'); 

// --- 2. TYPES ---

enum QuestionCategory {
  INTRO = 'INTRO',
  CONTEXT = 'CONTEXT',
  THEME_A = 'PRATIQUES',
  THEME_B = 'DIFFICULTES',
  THEME_C = 'BESOINS',
}

interface Question {
  id: string;
  category: QuestionCategory;
  text: string;
  tags: string[];
  answerTags?: string[];
  placeholder: string;
  imageUrl: string;
  isInfoOnly?: boolean;
}

interface ResponseData {
  text: string;
  selectedTags: string[];
}

interface SurveyResponse {
  [questionId: string]: ResponseData;
}

interface AiAnalysisResult {
  personaTitle: string;
  summary: string;
  topPainPoints: string[];
  suggestion: string;
  sentimentScore: number;
  categoryScores: { label: string; score: number; }[];
}

// --- 3. DATA ---

const SURVEY_DATA: Question[] = [
  {
    id: 'intro_01',
    category: QuestionCategory.INTRO,
    text: "Bienvenue à l'entrevue : Sorties Hivernales en position par rapport à l'enfant",
    tags: ['Recherche', 'Design', 'Innovation'],
    placeholder: "",
    // 只有首頁保留圖片
    imageUrl: "https://www.voyagesetenfants.com/wp-content/uploads/2020/11/2015.02.28-Raquette-%C3%A9cole-emilien-3-1024x576.jpg",
    isInfoOnly: true
  },
  {
    id: 'context_01',
    category: QuestionCategory.CONTEXT,
    text: "Cadre de la recherche",
    tags: ['Contexte', 'Objectifs'],
    placeholder: "Notre recherche porte sur les besoins concrets liés aux sorties hivernales avec les enfants. L’objectif est de mieux comprendre les défis rencontrés au quotidien (matériels, organisationnels) afin d’identifier des pistes d’amélioration réalistes.",
    imageUrl: "", // 已移除圖片
    isInfoOnly: true
  },
  {
    id: 'icebreaker',
    category: QuestionCategory.CONTEXT,
    text: "Pour commencer, pouvez-vous vous présenter brièvement et décrire votre rôle?",
    tags: ['Présentation', 'Rôle', 'Expérience'],
    // 增加了 'Autre' 選項
    answerTags: ['Éducatrice', 'Rotation', 'Direction', 'Conseillère Pédagogique', 'Parents', 'Grand-parents', 'Autre'],
    placeholder: "Veuillez préciser votre rôle...",
    imageUrl: "" // 已移除圖片
  },
  {
    id: 'cover_theme_a',
    category: QuestionCategory.THEME_A,
    text: "Thématique A : Décrire vos pratiques hivernales",
    tags: ['Routine', 'Activités'],
    placeholder: "Objectif : Comprendre concrètement comment se déroulent les sorties hivernales, de la préparation jusqu’au retour à l’intérieur.",
    imageUrl: "", // 已移除圖片
    isInfoOnly: true
  },
  {
    id: 'theme_a_1',
    category: QuestionCategory.THEME_A,
    text: "Comment décririez-vous une journée hivernale typique ?",
    tags: ['Routine', 'Horaire', 'Déroulement'],
    answerTags: ['Sortie Matin', 'Sortie Après-midi', 'Habillage long', 'Transition difficile', 'Routine fluide', 'Manque de temps', 'Grande cour', 'Parc public'],
    placeholder: "Le matin on commence par...",
    imageUrl: ""
  },
  {
    id: 'theme_a_2',
    category: QuestionCategory.THEME_A,
    text: "Quels types d’activités ou de jeux privilégiez-vous en hiver ?",
    tags: ['Jeux', 'Pédagogie', 'Extérieur'],
    answerTags: ['Glissade', 'Châteaux de neige', 'Promenade', 'Hockey/Sports', 'Pelles/Sceaux', 'Jeu libre', 'Observation nature', 'Peinture sur neige'],
    placeholder: "On fait souvent des glissades, des châteaux...",
    imageUrl: ""
  },
  {
    id: 'theme_a_3',
    category: QuestionCategory.THEME_A,
    text: "Est-ce que vous adaptez vos activités selon les conditions du jour ? Pourquoi ?",
    tags: ['Adaptation', 'Météo', 'Flexibilité'],
    answerTags: ['Grand froid', 'Verglas', 'Vent', 'Neige collante', 'Sortie raccourcie', 'Annulation', 'Marche seulement', 'Gymnase'],
    placeholder: "S'il fait très froid, on raccourcit la sortie...",
    imageUrl: ""
  },
  {
    id: 'theme_a_4',
    category: QuestionCategory.THEME_A,
    text: "Comment percevez-vous l’équilibre entre sécurité, plaisir et prise de risque contrôlé ?",
    tags: ['Sécurité', 'Risque', 'Plaisir'],
    answerTags: ['Risque encouragé', 'Surprotection', 'Peur des chutes', 'Glace dangereuse', 'Surveillance constante', 'Confiance aux enfants', 'Environnement sécurisé'],
    placeholder: "C'est un défi constant, car...",
    imageUrl: ""
  },
  {
    id: 'cover_theme_b',
    category: QuestionCategory.THEME_B,
    text: "Thématique B : Identifier les moments de difficulté",
    tags: ['Défis', 'Stress', 'Sécurité'],
    placeholder: "Objectifs : Guider la réflexion sur des situations spécifiques, les détails des stratégies d'adaptation et le stress quotidien.",
    imageUrl: "", // 已移除圖片
    isInfoOnly: true
  },
  {
    id: 'theme_b_1',
    category: QuestionCategory.THEME_B,
    text: "Quels sont les plus grands défis de gestion quotidienne en hiver ?",
    tags: ['Habillage', 'Transition', 'Vestiaire'],
    answerTags: ['Habillage difficile', 'Vestiaire trop petit', 'Mitaines perdues', 'Fermetures éclairs', 'Sueur', 'Impatience', 'Manque d\'autonomie'],
    placeholder: "L'habillage des 10 enfants en même temps est...",
    imageUrl: ""
  },
  {
    id: 'theme_b_2',
    category: QuestionCategory.THEME_B,
    text: "Y a-t-il des moments où vous vous sentez particulièrement impuissant(e) ou préoccupé(e) concernant la sécurité ?",
    tags: ['Stress', 'Chutes', 'Surveillance'],
    answerTags: ['Glace', 'Escaliers', 'Déneigement insuffisant', 'Chutes fréquentes', 'Visibilité réduite', 'Ratio enfants/adulte', 'Équipement brisé'],
    placeholder: "Quand c'est glacé près de la porte...",
    imageUrl: ""
  },
  {
    id: 'theme_b_3',
    category: QuestionCategory.THEME_B,
    text: "Certains enfants réagissent-ils différemment au froid (besoins particuliers, anxiété) ?",
    tags: ['Émotion', 'Besoins Spéciaux', 'Inconfort'],
    answerTags: ['Pleurs', 'Refus de bouger', 'Mains gelées', 'Asthme', 'Peau sensible', 'Besoin de bras', 'Aime le froid', 'Déteste la neige'],
    placeholder: "J'ai un enfant qui refuse de mettre ses mitaines...",
    imageUrl: ""
  },
  {
    id: 'theme_b_3.1',
    category: QuestionCategory.THEME_B,
    text: "Comment gérez-vous cela concrètement ?",
    tags: ['Stratégie', 'Patience', 'Adaptation'],
    placeholder: "Je prends le temps de...",
    imageUrl: ""
  },
  {
    id: 'theme_b_4',
    category: QuestionCategory.THEME_B,
    text: "Quels impacts observez-vous sur l'organisation et les routines lors d'annulations dues à la météo ?",
    tags: ['Annulation', 'Confinement', 'Énergie'],
    answerTags: ['Excitation', 'Bruit intense', 'Conflits', 'Manque d\'espace', 'Routine perturbée', 'Fatigue éducatrice', 'Jeux moteurs intérieurs'],
    placeholder: "Les enfants sont plus agités à l'intérieur...",
    imageUrl: ""
  },
  {
    id: 'cover_theme_c',
    category: QuestionCategory.THEME_C,
    text: "Thématique C : Faire émerger les besoins non satisfaits",
    tags: ['Besoins', 'Futur', 'Solutions'],
    placeholder: "Objectifs : Comprendre ce qui manque actuellement pour soutenir de meilleures expériences hivernales.",
    imageUrl: "", // 已移除圖片
    isInfoOnly: true
  },
  {
    id: 'theme_c_1',
    category: QuestionCategory.THEME_C,
    text: "Qu'est-ce qui vous manque le plus pour faciliter les sorties ?",
    tags: ['Besoins', 'Matériel', 'Aide'],
    answerTags: ['Plus de rangement', 'Aide à l\'habillage', 'Meilleurs vêtements', 'Cour mieux déneigée', 'Abri extérieur', 'Chauffage d\'appoint', 'Vestiaire plus grand'],
    placeholder: "Il nous faudrait plus d'espace pour...",
    imageUrl: ""
  },
  {
    id: 'theme_c_2',
    category: QuestionCategory.THEME_C,
    text: "Comment gérez-vous le séchage et le rangement des équipements mouillés ?",
    tags: ['Séchage', 'Rangement', 'Humidité'],
    answerTags: ['Sécheuse domestique', 'Sèche-mitaines mural', 'Radiateurs', 'Plancher mouillé', 'Odeurs', 'Manque de crochets', 'Mélange des vêtements'],
    placeholder: "C'est un chaos, on manque de crochets...",
    imageUrl: ""
  },
  {
    id: 'theme_c_3',
    category: QuestionCategory.THEME_C,
    text: "Si vous pouviez collaborer avec une équipe de designers, quel problème leur demanderiez-vous d’explorer en priorité ?",
    tags: ['Design', 'Priorité', 'Innovation'],
    answerTags: ['Vestiaire intelligent', 'Combinaison facile', 'Séchage rapide', 'Abri chauffé', 'Modules 4 saisons', 'Sol antidérapant', 'Rangement accessible'],
    placeholder: "Je leur demanderais de repenser le vestiaire...",
    imageUrl: ""
  },
  {
    id: 'theme_c_4',
    category: QuestionCategory.THEME_C,
    text: "Quels équipements actuels vous semblent utilisables mais inadéquats ? ",
    tags: ['Ergonomie', 'Efficacité', 'Critique'],
    answerTags: ['Zips coincés', 'Bottes lourdes', 'Mitaines qui tombent', 'Cache-cou mouillé', 'Pelles fragiles', 'Traîneaux instables', 'Modules glissants'],
    placeholder: "Les modules de jeux sont trop glissants...",
    imageUrl: ""
  },
  {
    id: 'theme_c_5',
    category: QuestionCategory.THEME_C,
    text: "Si vous pouviez imaginer un “espace hivernal idéal” pour les enfants, à quoi ressemblerait-il ?",
    tags: ['Rêve', 'Idéal', 'Futur'],
    answerTags: ['Toit transparent', 'Sol chauffant', 'Nature intégrée', 'Pentes douces', 'Cabane chauffée', 'Tunnel', 'Atelier extérieur'],
    placeholder: "Un espace couvert mais ouvert, avec...",
    imageUrl: ""
  },
  {
    id: 'theme_c_5.1',
    category: QuestionCategory.THEME_C,
    text: "Avez-vous d'autres remarques ou suggestions ?",
    tags: ['Libre', 'Conclusion'],
    placeholder: "Tout ce qui n'a pas été dit...",
    imageUrl: ""
  },   
];

// --- 4. SERVICES ---

const analyzeSurvey = async (
  responses: SurveyResponse,
  questions: Question[]
): Promise<AiAnalysisResult> => {
  if (!API_KEY) {
    console.warn("API Key manquante. Mode Simulation activé.");
    return new Promise(resolve => setTimeout(() => resolve({
      personaTitle: "Mode Simulation (Pas de Clé API)",
      summary: "Ceci est une analyse simulée car aucune clé API n'est détectée. Configurez VITE_API_KEY ou REACT_APP_API_KEY dans Netlify.",
      topPainPoints: ["Clé API manquante", "Données non analysées", "Simulation uniquement"],
      suggestion: "Ajoutez votre clé API dans les paramètres Netlify.",
      sentimentScore: 50,
      categoryScores: [
        { label: "Sécurité", score: 5 },
        { label: "Organisation", score: 5 },
        { label: "Matériel", score: 5 }
      ]
    }), 2000));
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getModel({
    model: "gemini-1.5-flash", 
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          personaTitle: { type: SchemaType.STRING },
          summary: { type: SchemaType.STRING },
          topPainPoints: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          suggestion: { type: SchemaType.STRING },
          sentimentScore: { type: SchemaType.NUMBER },
          categoryScores: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                label: { type: SchemaType.STRING },
                score: { type: SchemaType.NUMBER }
              }
            }
          }
        }
      }
    }
  });

  let transcript = "";
  questions.forEach(q => {
    if (!q.isInfoOnly) {
      const response = responses[q.id];
      const answerText = response?.text || "";
      const tagsList = response?.selectedTags?.join(", ") || "";
      transcript += `Q: ${q.text}\nA: ${answerText} [Tags: ${tagsList}]\n\n`;
    }
  });

  try {
    const result = await model.generateContent(
      `Analyse ces réponses d'entrevue concernant les sorties hivernales en garderie (CPE). 
       Agis comme un expert UX Research.
       Données: ${transcript}`
    );
    return JSON.parse(result.response.text()) as AiAnalysisResult;
  } catch (error) {
    console.error("Erreur Gemini:", error);
    return {
      personaTitle: "Erreur d'analyse",
      summary: "Une erreur est survenue lors de la communication avec l'IA.",
      topPainPoints: [],
      suggestion: "Veuillez réessayer plus tard.",
      sentimentScore: 0,
      categoryScores: []
    };
  }
};

// --- 5. RESULTS COMPONENT ---

const AnalysisView: React.FC<{
  result: AiAnalysisResult | null;
  loading: boolean;
  onRestart: () => void;
  responses: SurveyResponse;
}> = ({ result, loading, onRestart, responses }) => {
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sendError, setSendError] = useState(false);

  const handleSendResults = async () => {
    setIsSending(true);
    setSendError(false);

    const formattedData: any = { 
      _subject: "Nouvelle Réponse - Enquête CPE",
      _template: "table",
      _analysis_persona: result?.personaTitle,
      _analysis_summary: result?.summary,
    };
    
    SURVEY_DATA.forEach(q => {
      if (!q.isInfoOnly) {
        const r = responses[q.id];
        if (r && (r.text || r.selectedTags.length > 0)) {
           formattedData[`Q-${q.id}`] = `${r.text} [${r.selectedTags.join(',')}]`;
        }
      }
    });

    try {
      const response = await fetch(`https://formsubmit.co/ajax/${RESEARCHER_EMAIL}`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(formattedData)
      });
      
      if(response.ok) {
        setEmailSent(true);
      } else {
        setSendError(true);
      }
    } catch (e) {
      setSendError(true);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="text-6xl mb-6 animate-bounce">❄️</div>
      <div className="text-2xl font-bold text-slate-600 animate-pulse">L'IA analyse vos réponses...</div>
      <p className="text-slate-400 mt-2">Génération du profil et des recommandations</p>
    </div>
  );
  
  if (!result) return null;

  return (
    <div className="max-w-5xl mx-auto p-8 my-8">
      <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-slate-900 p-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-sky-500/20 to-purple-500/20"></div>
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">{result.personaTitle}</h2>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">{result.summary}</p>
          </div>
        </div>
        
        <div className="p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 mb-10">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center">
              <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest mb-4">Indice de Satisfaction</h3>
              <div className="relative">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="60" stroke="#e2e8f0" strokeWidth="8" fill="transparent" />
                  <circle cx="64" cy="64" r="60" stroke={result.sentimentScore > 50 ? "#0ea5e9" : "#f43f5e"} strokeWidth="8" fill="transparent" strokeDasharray={377} strokeDashoffset={377 - (377 * result.sentimentScore) / 100} className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-slate-700">{result.sentimentScore}%</div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest mb-6">Détails par Catégorie</h3>
              {result.categoryScores.map((c, i) => (
                 <div key={i} className="mb-4">
                   <div className="flex justify-between text-sm font-bold mb-2 text-slate-700">
                     <span>{c.label}</span>
                     <span className={c.score < 5 ? 'text-rose-500' : 'text-emerald-500'}>{c.score}/10</span>
                   </div>
                   <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                     <div style={{width: `${c.score*10}%`}} className={`h-full rounded-full ${c.score < 5 ? 'bg-rose-400' : 'bg-emerald-400'}`}></div>
                   </div>
                 </div>
              ))}
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-100 p-8 rounded-2xl mb-10">
            <h3 className="font-bold text-rose-600 mb-6 flex items-center text-lg">
              <span className="text-2xl mr-3">⚠️</span> Points de friction majeurs
            </h3>
            <ul className="space-y-3">
              {result.topPainPoints.map((p, i) => (
                <li key={i} className="text-slate-800 flex items-start">
                  <span className="inline-block w-2 h-2 bg-rose-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-50 p-8 rounded-2xl mb-12 border-l-4 border-sky-500">
             <h3 className="font-bold text-sky-800 mb-2 uppercase text-xs tracking-widest">Suggestion IA</h3>
             <p className="text-slate-700 text-lg italic">"{result.suggestion}"</p>
          </div>

          <div className="border-t border-slate-100 pt-10 text-center space-y-6">
            {!emailSent ? (
              <>
                <p className="text-slate-500">Envoyez vos réponses anonymisées pour contribuer à la recherche.</p>
                <button 
                  onClick={handleSendResults} 
                  disabled={isSending} 
                  className={`
                    px-10 py-4 rounded-xl font-bold text-lg shadow-xl transition-all
                    ${isSending ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-sky-500 text-white hover:bg-sky-400 hover:scale-105 hover:shadow-sky-200'}
                  `}
                >
                  {isSending ? "Envoi en cours..." : "Envoyer mes réponses"}
                </button>
                {sendError && <p className="text-rose-500 font-medium bg-rose-50 inline-block px-4 py-2 rounded-lg">Erreur d'envoi. Vérifiez votre connexion.</p>}
              </>
            ) : (
              <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl inline-block">
                <p className="text-emerald-600 font-bold text-2xl mb-2">✅ Merci !</p>
                <p className="text-emerald-800">Vos réponses ont été transmises avec succès.</p>
              </div>
            )}
            
            <div className="flex justify-center gap-8 text-sm font-medium text-slate-400 mt-8">
               <button onClick={() => window.print()} className="hover:text-slate-700 flex items-center gap-2">🖨️ Sauvegarder PDF</button>
               <button onClick={onRestart} className="hover:text-slate-700 flex items-center gap-2">🔄 Nouvelle entrevue</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 6. MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<SurveyResponse>({});
  const [isFinished, setIsFinished] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AiAnalysisResult | null>(null);
  const [bgImage, setBgImage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = SURVEY_DATA[currentIndex];
  const isLastQuestion = currentIndex === SURVEY_DATA.length - 1;
  const currentResponse = responses[currentQuestion.id] || { text: '', selectedTags: [] };
  
  // Logic: 
  // 1. InfoOnly cards are always valid.
  // 2. Icebreaker (id='icebreaker') logic:
  //    - If "Autre" tag IS selected -> Text is REQUIRED.
  //    - If "Autre" tag is NOT selected -> Text is HIDDEN and NOT required (valid if at least 1 tag).
  // 3. Other questions:
  //    - Valid if text is present OR tags are present (if mandatory).
  
  const isIcebreaker = currentQuestion.id === 'icebreaker';
  const isAutreSelected = currentResponse.selectedTags.includes('Autre');

  let isValid = true;
  const isMandatory = !currentQuestion.isInfoOnly;

  if (isMandatory) {
    if (isIcebreaker) {
      if (isAutreSelected) {
        // Must have text if "Autre" is selected
        isValid = currentResponse.text && currentResponse.text.trim().length > 0;
      } else {
        // Must have at least one tag if "Autre" is NOT selected
        isValid = currentResponse.selectedTags.length > 0;
      }
    } else {
      // Normal logic for other questions
      const hasContent = (currentResponse.text && currentResponse.text.trim().length > 0) || currentResponse.selectedTags.length > 0;
      isValid = hasContent;
    }
  }

  const handleNext = async () => {
    if (!isValid && isMandatory) return;

    if (isLastQuestion) {
       setIsFinished(true);
       setAnalysisLoading(true);
       const res = await analyzeSurvey(responses, SURVEY_DATA);
       setAnalysisResult(res);
       setAnalysisLoading(false);
    } else {
       setCurrentIndex(prev => prev + 1);
       window.scrollTo(0,0);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleTagToggle = (tag: string) => {
    const tags = currentResponse.selectedTags.includes(tag) 
      ? currentResponse.selectedTags.filter(t => t !== tag) 
      : [...currentResponse.selectedTags, tag];
    setResponses({...responses, [currentQuestion.id]: {...currentResponse, selectedTags: tags}});
  };

  const handleTextChange = (text: string) => {
    setResponses({...responses, [currentQuestion.id]: {...currentResponse, text}});
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => setBgImage(reader.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // --- RENDER: ANALYSIS VIEW ---
  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <AnalysisView 
          result={analysisResult} 
          loading={analysisLoading} 
          responses={responses} 
          onRestart={() => window.location.reload()} 
        />
      </div>
    );
  }

  // --- RENDER: INTRO VIEW ---
  if (currentIndex === 0) {
     return (
        <div className="relative h-screen w-full bg-slate-900 overflow-hidden group">
           <div className="absolute inset-0 bg-slate-800">
             <img 
              src={bgImage || currentQuestion.imageUrl} 
              className="w-full h-full object-cover opacity-60 transition-transform duration-[20s] ease-in-out transform scale-100 group-hover:scale-110" 
              alt="Background"
              onError={(e) => {e.currentTarget.style.display='none'}}
             />
           </div>
           
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
           
           <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-6 max-w-5xl mx-auto">
              <div className="mb-8">
                <span className="px-5 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white/90 text-xs font-bold uppercase tracking-[0.2em] shadow-lg">
                  {currentQuestion.tags.join(' • ')}
                </span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-white mb-10 drop-shadow-2xl leading-tight tracking-tight">
                {currentQuestion.text}
              </h1>
              
              <button 
                onClick={handleNext} 
                className="group relative px-12 py-5 bg-white text-slate-900 text-xl font-bold rounded-full overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)]"
              >
                <span className="relative z-10 flex items-center">
                  Commencer l'entrevue <span className="ml-3 group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="absolute top-8 right-8 p-3 bg-black/20 hover:bg-white/20 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-all border border-white/10" 
                title="Changer l'image de fond"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
           </div>
        </div>
     );
  }

  // --- RENDER: QUESTION FLOW ---

  const getCategoryColor = (c: string) => {
    if(c === 'PRATIQUES') return 'bg-sky-50 from-sky-50 to-white';
    if(c === 'DIFFICULTES') return 'bg-orange-50 from-orange-50 to-white';
    if(c === 'BESOINS') return 'bg-indigo-50 from-indigo-50 to-white';
    return 'bg-slate-50 from-slate-50 to-white';
  };

  const progress = ((currentIndex) / (SURVEY_DATA.length - 1)) * 100;
  
  // Decide whether to show textarea based on "Icebreaker + Autre" logic
  const shouldShowTextarea = !isIcebreaker || (isIcebreaker && isAutreSelected);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 bg-gradient-to-br ${getCategoryColor(currentQuestion.category)} transition-colors duration-700`}>
       <div className="max-w-4xl w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col min-h-[650px] border border-white/50 relative">
          
          <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 z-20">
             <div 
               className="h-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-700 ease-out" 
               style={{width: `${progress}%`}}
             ></div>
          </div>
          
          <div className="p-8 md:p-14 flex flex-col flex-grow relative z-10">
            <div className="mb-8 flex justify-between items-end border-b border-slate-100 pb-4">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase">
                  {currentQuestion.category}
                </span>
                <span className="text-slate-300 text-sm font-medium">Question {currentIndex} / {SURVEY_DATA.length - 1}</span>
              </div>
              <div className="hidden md:flex gap-1">
                 {currentQuestion.tags.map(t => (
                   <span key={t} className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider">{t}</span>
                 ))}
              </div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-10 leading-tight">
              {currentQuestion.text} 
              {isMandatory && !currentQuestion.isInfoOnly && <span className="text-rose-400 text-2xl ml-1 align-top" title="Requis">*</span>}
            </h2>
            
            <div className="flex-grow">
              {currentQuestion.isInfoOnly ? (
                 <div className="bg-gradient-to-br from-sky-50 to-white p-10 rounded-3xl border border-sky-100 shadow-sm flex flex-col md:flex-row gap-8 items-center">
                    {currentQuestion.imageUrl && (
                      <div className="w-full md:w-1/3 h-48 rounded-2xl overflow-hidden shadow-md flex-shrink-0">
                         <img src={currentQuestion.imageUrl} className="w-full h-full object-cover" alt="Illustration" />
                      </div>
                    )}
                    <div>
                      <p className="text-xl font-medium text-slate-700 leading-relaxed">{currentQuestion.placeholder}</p>
                      <div className="mt-6 flex items-center text-sky-600 text-sm font-bold uppercase tracking-wide animate-pulse">
                        <span>Continuez</span> <span className="ml-2">→</span>
                      </div>
                    </div>
                 </div>
              ) : (
                 <div className="space-y-6">
                    {currentQuestion.answerTags && (
                      <div className="flex flex-wrap gap-3 mb-6">
                         {currentQuestion.answerTags.map(tag => {
                            const isSelected = currentResponse.selectedTags.includes(tag);
                            return (
                              <button 
                                key={tag} 
                                onClick={() => handleTagToggle(tag)} 
                                className={`
                                  px-5 py-2.5 rounded-xl font-bold text-sm border transition-all duration-200
                                  ${isSelected 
                                    ? 'bg-slate-800 text-white border-slate-800 shadow-lg scale-105' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-sky-300 hover:text-sky-600 hover:shadow-sm'}
                                `}
                              >
                                {tag}
                              </button>
                            );
                         })}
                      </div>
                    )}
                    
                    {shouldShowTextarea && (
                      <div className="relative animate-fade-in-up">
                        <textarea 
                          value={currentResponse.text} 
                          onChange={e => handleTextChange(e.target.value)}
                          className={`
                            w-full h-48 p-6 text-lg rounded-2xl outline-none resize-none transition-all shadow-inner
                            ${(!isValid && isMandatory) 
                              ? 'bg-rose-50 border-2 border-rose-200 focus:border-rose-400 placeholder-rose-300' 
                              : 'bg-slate-50 border-2 border-transparent focus:bg-white focus:border-sky-500 focus:shadow-xl placeholder-slate-300'}
                          `}
                          placeholder={currentQuestion.placeholder || "Écrivez votre réponse ici..."}
                        />
                        {!isValid && isMandatory && (
                          <div className="absolute bottom-4 right-4 text-rose-500 text-xs font-bold bg-white/80 px-2 py-1 rounded-md shadow-sm pointer-events-none">
                            Réponse requise
                          </div>
                        )}
                      </div>
                    )}
                 </div>
              )}
            </div>
            
            <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-center">
               <button 
                 onClick={handlePrev} 
                 className="px-6 py-3 rounded-xl text-slate-400 font-bold hover:bg-slate-50 hover:text-slate-700 transition-colors flex items-center group"
               >
                 <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Retour
               </button>

               <button 
                 onClick={handleNext} 
                 disabled={!isValid && isMandatory} 
                 className={`
                   px-10 py-4 rounded-xl font-bold transition-all shadow-lg flex items-center
                   ${(!isValid && isMandatory)
                     ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none' 
                     : 'bg-slate-900 text-white hover:bg-sky-600 hover:scale-105 hover:shadow-sky-200/50'}
                 `}
               >
                 {isLastQuestion ? 'Terminer' : 'Suivant'} <span className="ml-2">→</span>
               </button>
            </div>
          </div>
       </div>
    </div>
  );
}

export default App;
