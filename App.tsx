import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// --- 1. CONFIGURATION & UTILS ---

/**
 * 安全獲取環境變量 (兼容 Vite 和 Create React App)
 * 解決 Netlify "process is not defined" 或 TypeScript 錯誤
 */
const getEnv = (key: string): string => {
  let value = '';
  try {
    // 嘗試 Vite 方式 (import.meta.env)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      value = import.meta.env[`VITE_${key}`] || import.meta.env[key];
    }
  } catch (e) { /* ignore */ }

  if (!value) {
    try {
      // 嘗試 CRA/Node 方式 (process.env)
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
    imageUrl: "https://www.voyagesetenfants.com/wp-content/uploads/2020/11/2015.02.28-Raquette-%C3%A9cole-emilien-3-1024x576.jpg",
    isInfoOnly: true
  },
  {
    id: 'context_01',
    category: QuestionCategory.CONTEXT,
    text: "Cadre de la recherche",
    tags: ['Contexte', 'Objectifs'],
    placeholder: "Notre recherche porte sur les besoins concrets liés aux sorties hivernales avec les enfants. L’objectif est de mieux comprendre les défis rencontrés au quotidien (matériels, organisationnels) afin d’identifier des pistes d’amélioration réalistes.",
    imageUrl: "https://picsum.photos/seed/winter_research/800/600",
    isInfoOnly: true
  },
  {
    id: 'icebreaker',
    category: QuestionCategory.CONTEXT,
    text: "Pour commencer, pouvez-vous vous présenter brièvement et décrire votre rôle?",
    tags: ['Présentation', 'Rôle', 'Expérience'],
    answerTags: ['Éducatrice', 'Rotation', 'Direction', 'Conseillère Pédagogique', 'Parents', 'Grand-parents'],
    placeholder: "Ex: Je suis éducatrice depuis 10 ans auprès des 4-5 ans...",
    imageUrl: "https://picsum.photos/seed/teacher/800/600"
  },
  {
    id: 'cover_theme_a',
    category: QuestionCategory.THEME_A,
    text: "Thématique A : Décrire vos pratiques hivernales",
    tags: ['Routine', 'Activités'],
    placeholder: "Objectif : Comprendre concrètement comment se déroulent les sorties hivernales, de la préparation jusqu’au retour à l’intérieur.",
    imageUrl: "https://picsum.photos/seed/winter_morning/800/600",
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
    text: "Est-ce que vous adaptez vos activités selon les conditions du jour ? Pourquoi ?",
    tags: ['Adaptation', 'Météo', 'Flexibilité'],
    answerTags: ['Grand froid', 'Verglas', 'Vent', 'Neige collante', 'Sortie raccourcie', 'Annulation', 'Marche seulement', 'Gymnase'],
