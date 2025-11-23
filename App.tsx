declare const process: any;

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

// 1. CONFIGURATION
const RESEARCHER_EMAIL = "penghann@hotmail.com"; 

// 2. TYPES
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

// 3. DATA
const SURVEY_DATA: Question[] = [
  {
    id: 'intro_01',
    category: QuestionCategory.INTRO,
    text: "Bienvenue à l'entrevue : Sorties Hivernales en CPE",
    tags: ['Recherche', 'Design', 'Innovation'],
    placeholder: "",
    imageUrl: "/cover.jpg",
    isInfoOnly: true
  },
  {
    id: 'context_01',
    category: QuestionCategory.CONTEXT,
    text: "Cadre de la recherche",
    tags: ['Contexte', 'Objectifs'],
    placeholder: "Notre recherche porte sur les besoins concrets liés aux sorties hivernales avec les enfants en CPE. L’objectif est de mieux comprendre les défis rencontrés au quotidien (matériels, organisationnels) afin d’identifier des pistes d’amélioration réalistes.",
    imageUrl: "https://picsum.photos/seed/winter_research/800/600",
    isInfoOnly: true
  },
  {
    id: 'icebreaker',
    category: QuestionCategory.CONTEXT,
    text: "Pour commencer, pouvez-vous vous présenter brièvement et décrire votre rôle au sein du CPE ?",
    tags: ['Présentation', 'Rôle', 'Expérience'],
    answerTags: ['Éducatrice 0-2 ans', 'Éducatrice 3-5 ans', 'Rotation', 'Direction', 'Conseillère Pédagogique', '> 10 ans exp.', '< 5 ans exp.'],
    placeholder: "Ex: Je suis éducatrice depuis 10 ans auprès des 4-5 ans...",
    imageUrl: "https://picsum.photos/seed/teacher/800/600"
  },
  {
    id: 'cover_theme_a',
    category: QuestionCategory.THEME_A,
    text: "Thématique A : Décrire vos pratiques hivernales",
    tags: ['Routine', 'Activités'],
    placeholder: "Objectif : Comprendre concrètement comment se déroulent les sorties hivernales en CPE, de la préparation jusqu’au retour à l’intérieur.",
    imageUrl: "",
    isInfoOnly: true
  },
  {
    id: 'theme_a_1',
    category: QuestionCategory.THEME_A,
    text: "Comment décririez-vous une journée hivernale typique ?",
    tags: ['Routine', 'Horaire', 'Déroulement'],
    answerTags: ['Sortie Matin', 'Sortie Après-midi', 'Habillage long', 'Transition difficile', 'Routine fluide', 'Manque de temps', 'Grande cour', 'Parc public'],
    placeholder: "Le matin on commence par...",
    imageUrl: "https://picsum.photos/seed/winter_day/800/600"
  },
  {
    id: 'theme_a_2',
    category: QuestionCategory.THEME_A,
    text: "Quels types d’activités ou de jeux privilégiez-vous en hiver ?",
    tags: ['Jeux', 'Pédagogie', 'Extérieur'],
    answerTags: ['Glissade', 'Châteaux de neige', 'Promenade', 'Hockey/Sports', 'Pelles/Sceaux', 'Jeu libre', 'Observation nature', 'Peinture sur neige'],
    placeholder: "On fait souvent des glissades, des châteaux...",
    imageUrl: "https://picsum.photos/seed/snow_play/800/600"
  },
  {
    id: 'theme_a_3',
    category: QuestionCategory.THEME_A,
    text: "Est-ce que vous adaptez vos activités selon les conditions du jour ? Comment ?",
    tags: ['Adaptation', 'Météo', 'Flexibilité'],
    answerTags: ['Grand froid', 'Verglas', 'Vent', 'Neige collante', 'Sortie raccourcie', 'Annulation', 'Marche seulement', 'Gymnase'],
    placeholder: "S'il fait très froid, on raccourcit la sortie...",
    imageUrl: "https://picsum.photos/seed/snow_storm/800/600"
  },
  {
    id: 'theme_a_4',
    category: QuestionCategory.THEME_A,
    text: "Comment percevez-vous l’équilibre entre sécurité, plaisir et prise de risque contrôlé ?",
    tags: ['Sécurité', 'Risque', 'Plaisir'],
    answerTags: ['Risque encouragé', 'Surprotection', 'Peur des chutes', 'Glace dangereuse', 'Surveillance constante', 'Confiance aux enfants', 'Environnement sécurisé'],
    placeholder: "C'est un défi constant, car...",
    imageUrl: "https://picsum.photos/seed/safety_kids/800/600"
  },
  {
    id: 'cover_theme_b',
    category: QuestionCategory.THEME_B,
    text: "Thématique B : Identifier les moments de difficulté",
    tags: ['Défis', 'Stress', 'Sécurité'],
    placeholder: "Objectifs : Guider la réflexion sur des situations spécifiques, les détails des stratégies d'adaptation et le stress quotidien.",
    imageUrl: "",
    isInfoOnly: true
  },
  {
    id: 'theme_b_1',
    category: QuestionCategory.THEME_B,
    text: "Quels sont les plus grands défis de gestion quotidienne en hiver ?",
    tags: ['Habillage', 'Transition', 'Vestiaire'],
    answerTags: ['Habillage difficile', 'Vestiaire trop petit', 'Mitaines perdues', 'Fermetures éclairs', 'Sueur', 'Impatience', 'Manque d\'autonomie'],
    placeholder: "L'habillage des 10 enfants en même temps est...",
    imageUrl: "https://picsum.photos/seed/winter_clothes/800/600"
  },
  {
    id: 'theme_b_2',
    category: QuestionCategory.THEME_B,
    text: "Y a-t-il des moments où vous vous sentez particulièrement impuissant(e) ou préoccupé(e) concernant la sécurité ?",
    tags: ['Stress', 'Chutes', 'Surveillance'],
    answerTags: ['Glace noire', 'Escaliers', 'Déneigement insuffisant', 'Chutes fréquentes', 'Visibilité réduite', 'Ratio enfants/adulte', 'Équipement brisé'],
    placeholder: "Quand c'est glacé près de la porte...",
    imageUrl: "https://picsum.photos/seed/ice/800/600"
  },
  {
    id: 'theme_b_3',
    category: QuestionCategory.THEME_B,
    text: "Certains enfants réagissent-ils différemment au froid (besoins particuliers, anxiété) ? Comment gérez-vous cela ?",
    tags: ['Émotion', 'Besoins Spéciaux', 'Inconfort'],
    answerTags: ['Pleurs', 'Refus de bouger', 'Mains gelées', 'Asthme', 'Peau sensible', 'Besoin de bras', 'Aime le froid', 'Déteste la neige'],
    placeholder: "J'ai un enfant qui refuse de mettre ses mitaines...",
    imageUrl: "https://picsum.photos/seed/crying_child/800/600"
  },
  {
    id: 'theme_b_4',
    category: QuestionCategory.THEME_B,
    text: "Quels impacts observez-vous sur l'organisation et les routines lors d'annulations dues à la météo ?",
    tags: ['Annulation', 'Confinement', 'Énergie'],
    answerTags: ['Excitation', 'Bruit intense', 'Conflits', 'Manque d\'espace', 'Routine perturbée', 'Fatigue éducatrice', 'Jeux moteurs intérieurs'],
    placeholder: "Les enfants sont plus agités à l'intérieur...",
    imageUrl: "https://picsum.photos/seed/indoor_play/800/600"
  },
  {
    id: 'cover_theme_c',
    category: QuestionCategory.THEME_C,
    text: "Thématique C : Faire émerger les besoins non satisfaits",
    tags: ['Besoins', 'Futur', 'Solutions'],
    placeholder: "Objectifs : Comprendre ce qui manque actuellement pour soutenir de meilleures expériences hivernales au sens des CPE.",
    imageUrl: "",
    isInfoOnly: true
  },
  {
    id: 'theme_c_1',
    category: QuestionCategory.THEME_C,
    text: "Quels soutiens matériels ou organisationnels vous manquent le plus pour faciliter les sorties ?",
    tags: ['Besoins', 'Matériel', 'Aide'],
    answerTags: ['Plus de rangement', 'Aide à l\'habillage', 'Meilleurs vêtements', 'Cour mieux déneigée', 'Abri extérieur', 'Chauffage d\'appoint', 'Vestiaire plus grand'],
    placeholder: "Il nous faudrait plus d'espace pour...",
    imageUrl: "https://picsum.photos/seed/empty_locker/800/600"
  },
  {
    id: 'theme_c_2',
    category: QuestionCategory.THEME_C,
    text: "Comment gérez-vous le séchage et le rangement des équipements mouillés ?",
    tags: ['Séchage', 'Rangement', 'Humidité'],
    answerTags: ['Sécheuse domestique', 'Sèche-mitaines mural', 'Radiateurs', 'Plancher mouillé', 'Odeurs', 'Manque de crochets', 'Mélange des vêtements'],
    placeholder: "C'est un chaos, on manque de crochets...",
    imageUrl: "https://picsum.photos/seed/wet_clothes/800/600"
  },
  {
    id: 'theme_c_3',
    category: QuestionCategory.THEME_C,
    text: "Si vous pouviez collaborer avec une équipe de designers, quel problème leur demanderiez-vous d’explorer en priorité ?",
    tags: ['Design', 'Priorité', 'Innovation'],
    answerTags: ['Vestiaire intelligent', 'Combinaison facile', 'Séchage rapide', 'Abri chauffé', 'Modules 4 saisons', 'Sol antidérapant', 'Rangement accessible'],
    placeholder: "Je leur demanderais de repenser le vestiaire...",
    imageUrl: "https://picsum.photos/seed/design_sketch/800/600"
  },
  {
    id: 'theme_c_4',
    category: QuestionCategory.THEME_C,
    text: "Quels équipements actuels vous semblent utilisables mais inadéquats ? Qu'est-ce qui manque ?",
    tags: ['Ergonomie', 'Efficacité', 'Critique'],
    answerTags: ['Zips coincés', 'Bottes lourdes', 'Mitaines qui tombent', 'Cache-cou mouillé', 'Pelles fragiles', 'Traîneaux instables', 'Modules glissants'],
    placeholder: "Les modules de jeux sont trop glissants...",
    imageUrl: "https://picsum.photos/seed/playground/800/600"
  },
  {
    id: 'theme_c_5',
    category: QuestionCategory.THEME_C,
    text: "Si vous pouviez imaginer un “espace hivernal idéal” pour les enfants, à quoi ressemblerait-il ?",
    tags: ['Rêve', 'Idéal', 'Futur'],
    answerTags: ['Toit transparent', 'Sol chauffant', 'Nature intégrée', 'Pentes douces', 'Cabane chauffée', 'Tunnel', 'Atelier extérieur'],
    placeholder: "Un espace couvert mais ouvert, avec...",
    imageUrl: "https://picsum.photos/seed/winter_wonderland/800/600"
  }
];

// 4. SERVICES
const analyzeSurvey = async (
  responses: SurveyResponse,
  questions: Question[]
): Promise<AiAnalysisResult> => {
  if (!process.env.API_KEY) {
    return {
      personaTitle: "Mode Simulation",
      summary: "Ceci est une analyse simulée car aucune clé API n'est connectée. Les données seront tout de même envoyées par email.",
      topPainPoints: ["Simulation Activée", "Pas de clé API détectée"],
      suggestion: "Vérifiez vos emails pour voir les réponses brutes.",
      sentimentScore: 80,
      categoryScores: [
        { label: "Sécurité", score: 5 },
        { label: "Organisation", score: 6 },
        { label: "Matériel", score: 4 }
      ]
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyse ces réponses. JSON Requis: personaTitle, summary, topPainPoints (array), suggestion, sentimentScore (0-100), categoryScores (array {label, score}). \n\n ${transcript}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            personaTitle: { type: Type.STRING },
            summary: { type: Type.STRING },
            topPainPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestion: { type: Type.STRING },
            sentimentScore: { type: Type.INTEGER },
            categoryScores: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  score: { type: Type.INTEGER }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}") as AiAnalysisResult;
  } catch (error) {
    return {
      personaTitle: "Erreur IA",
      summary: "Erreur de connexion.",
      topPainPoints: [],
      suggestion: "",
      sentimentScore: 0,
      categoryScores: []
    };
  }
};

// 5. RESULTS VIEW
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
      _template: "table"
    };
    
    SURVEY_DATA.forEach(q => {
      if (!q.isInfoOnly) {
        const r = responses[q.id];
        formattedData[`Q-${q.id}`] = `RÉPONSE: ${r?.text || 'N/A'} | TAGS: ${r?.selectedTags?.join(',') || 'N/A'}`;
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center animate-pulse">
        <div className="text-4xl mb-4">🤖</div>
        <div className="text-2xl font-bold text-slate-600">Analyse des réponses...</div>
      </div>
    </div>
  );
  
  if (!result) return null;

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-3xl shadow-xl m-4 border border-slate-100">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-extrabold text-slate-900 mb-4">{result.personaTitle}</h2>
        <p className="text-lg text-slate-600">{result.summary}</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center">
          <h3 className="font-bold text-slate-400 uppercase text-sm mb-2">Moral Global</h3>
          <div className="text-6xl font-bold text-sky-500">{result.sentimentScore}%</div>
        </div>
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h3 className="font-bold text-slate-400 uppercase text-sm mb-4">Scores par Catégorie</h3>
          {result.categoryScores.map((c, i) => (
             <div key={i} className="mb-3">
               <div className="flex justify-between text-sm font-bold mb-1 text-slate-700"><span>{c.label}</span><span>{c.score}/10</span></div>
               <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                 <div style={{width: `${c.score*10}%`}} className="h-full bg-blue-500 rounded-full"></div>
               </div>
             </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-rose-100 p-6 rounded-2xl mb-8 shadow-sm">
        <h3 className="font-bold text-rose-500 mb-4 flex items-center"><span className="mr-2">⚠️</span> Points de friction majeurs</h3>
        <ul className="space-y-2">
          {result.topPainPoints.map((p, i) => <li key={i} className="text-slate-700 flex"><span className="mr-2">•</span>{p}</li>)}
        </ul>
      </div>

      <div className="bg-slate-900 p-8 rounded-2xl text-center space-y-6">
        {!emailSent ? (
          <>
            <p className="text-slate-300">Cliquez ci-dessous pour envoyer les résultats au chercheur.</p>
            <button onClick={handleSendResults} disabled={isSending} className="bg-sky-500 hover:bg-sky-400 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:scale-105 disabled:opacity-50">
              {isSending ? "Envoi en cours..." : "Envoyer mes réponses"}
            </button>
            {sendError && <p className="text-rose-400">Erreur d'envoi. Vérifiez votre connexion.</p>}
          </>
        ) : (
          <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl">
            <p className="text-emerald-400 font-bold text-xl">✅ Réponses envoyées avec succès !</p>
            <p className="text-emerald-200/70 text-sm mt-1">Merci de votre participation.</p>
          </div>
        )}
        
        <div className="flex justify-center gap-6 text-slate-400 pt-4 border-t border-slate-700">
           <button onClick={() => window.print()} className="hover:text-white underline">Sauvegarder en PDF</button>
           <button onClick={onRestart} className="hover:text-white underline">Nouvelle entrevue</button>
        </div>
      </div>
    </div>
  );
};

// 6. MAIN APP
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
  
  const isMandatory = !currentQuestion.isInfoOnly && ['PRATIQUES', 'DIFFICULTES', 'BESOINS'].includes(currentQuestion.category);
  const isValid = currentQuestion.isInfoOnly || !isMandatory || (currentResponse.text && currentResponse.text.trim().length > 0);

  const handleNext = async () => {
    if (!isValid && currentIndex !== 0) return;
    if (isLastQuestion) {
       setIsFinished(true);
       setAnalysisLoading(true);
       const res = await analyzeSurvey(responses, SURVEY_DATA);
       setAnalysisResult(res);
       setAnalysisLoading(false);
    } else {
       setCurrentIndex(prev => prev + 1);
    }
  };

  const handleTagToggle = (tag: string) => {
    const tags = currentResponse.selectedTags.includes(tag) 
      ? currentResponse.selectedTags.filter(t => t !== tag) 
      : [...currentResponse.selectedTags, tag];
    setResponses({...responses, [currentQuestion.id]: {...currentResponse, selectedTags: tags}});
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => setBgImage(reader.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  if (isFinished) return <div className="min-h-screen bg-slate-50 py-12"><AnalysisView result={analysisResult} loading={analysisLoading} responses={responses} onRestart={() => window.location.reload()} /></div>;

  if (currentIndex === 0) {
     return (
        <div className="relative h-screen w-full bg-slate-900 overflow-hidden">
           <img src={bgImage || currentQuestion.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" />
           <div className="absolute inset-0 bg-black/40"></div>
           <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4 max-w-5xl mx-auto">
              <span className="mb-6 px-4 py-1 border border-white/30 rounded-full text-white/80 text-sm uppercase tracking-widest">{currentQuestion.tags.join(' • ')}</span>
              <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-8 drop-shadow-xl leading-tight">{currentQuestion.text}</h1>
              <button onClick={() => fileInputRef.current?.click()} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 backdrop-blur rounded-full text-white transition-all" title="Changer l'image">📷</button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <button onClick={handleNext} className="px-12 py-5 bg-white text-slate-900 text-xl font-bold rounded-full hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all flex items-center">
                Commencer <span className="ml-2">→</span>
              </button>
           </div>
        </div>
     );
  }

  const getCategoryColor = (c: string) => {
    if(c === 'PRATIQUES') return 'bg-sky-50';
    if(c === 'DIFFICULTES') return 'bg-orange-50';
    if(c === 'BESOINS') return 'bg-indigo-50';
    return 'bg-slate-50';
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${getCategoryColor(currentQuestion.category)} transition-colors duration-500`}>
       <div className="max-w-3xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[600px]">
          <div className="w-full bg-slate-100 h-2"><div className="bg-sky-500 h-full transition-all duration-500" style={{width: `${(currentIndex/SURVEY_DATA.length)*100}%`}}></div></div>
          
          <div className="p-8 md:p-12 flex flex-col flex-grow">
            <div className="mb-6 flex justify-between items-center">
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full tracking-widest">{currentQuestion.category}</span>
              <div className="text-xs text-slate-400">{currentIndex + 1} / {SURVEY_DATA.length}</div>
            </div>
            
            <h2 className="text-3xl font-bold text-slate-800 mb-8 leading-snug">
              {currentQuestion.text} 
              {isMandatory && <span className="text-rose-500 ml-2 text-xl align-top" title="Réponse requise">*</span>}
            </h2>
            
            <div className="flex-grow">
              {currentQuestion.isInfoOnly ? (
                 <div className="bg-sky-50 p-8 rounded-2xl border-l-4 border-sky-500 text-sky-900">
                    <p className="text-xl font-semibold mb-2">{currentQuestion.placeholder}</p>
                    <p className="text-sm text-sky-600 mt-4 uppercase font-bold tracking-wide">→ Cliquez sur Suivant pour continuer</p>
                 </div>
              ) : (
                 <div className="space-y-6">
                    {currentQuestion.answerTags && (
                      <div className="flex flex-wrap gap-2">
                         {currentQuestion.answerTags.map(tag => (
                            <button key={tag} onClick={() => handleTagToggle(tag)} className={`px-4 py-2 rounded-full font-bold text-sm border-2 transition-all ${currentResponse.selectedTags.includes(tag) ? 'bg-sky-600 text-white border-sky-600 shadow-md' : 'text-slate-500 border-slate-100 hover:border-sky-200'}`}>{tag}</button>
                         ))}
                      </div>
                    )}
                    <textarea 
                      value={currentResponse.text} 
                      onChange={e => setResponses({...responses, [currentQuestion.id]: {...currentResponse, text: e.target.value}})}
                      className={`w-full h-48 p-5 border-2 rounded-2xl outline-none resize-none transition-all text-lg ${!isValid && isMandatory ? 'border-rose-200 bg-rose-50 focus:border-rose-400' : 'border-slate-100 bg-slate-50 focus:bg-white focus:border-sky-500 focus:shadow-md'}`}
                      placeholder={currentQuestion.placeholder || "Écrivez votre réponse ici..."}
                    />
                    {!isValid && isMandatory && <p className="text-rose-500 text-sm font-bold animate-pulse">Réponse écrite requise</p>}
                 </div>
              )}
            </div>
            
            <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center">
               <button onClick={() => setCurrentIndex(c => c - 1)} className="text-slate-400 font-bold hover:text-slate-700 transition-colors flex items-center"><span className="mr-2">←</span> Retour</button>
               <button onClick={handleNext} disabled={!isValid && currentIndex !== 0} className={`px-8 py-3 rounded-xl font-bold transition-all transform hover:-translate-y-1 shadow-lg ${isValid || currentIndex === 0 ? 'bg-slate-900 text-white hover:bg-sky-600' : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'}`}>
                 {isLastQuestion ? 'Terminer' : 'Suivant'} <span className="ml-2">→</span>
               </button>
            </div>
          </div>
       </div>
    </div>
  );
}

export default App;
