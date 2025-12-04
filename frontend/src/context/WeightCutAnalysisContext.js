import React, { createContext, useContext, useState } from 'react';

const WeightCutAnalysisContext = createContext();

export const useWeightCutAnalysis = () => {
  const context = useContext(WeightCutAnalysisContext);
  if (!context) {
    throw new Error('useWeightCutAnalysis must be used within WeightCutAnalysisProvider');
  }
  return context;
};

export const WeightCutAnalysisProvider = ({ children }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);

  const startAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisReady(false);
    setAnalysisData(null);
  };

  const finishAnalysis = (data) => {
    setIsAnalyzing(false);
    setAnalysisReady(true);
    setAnalysisData(data);
  };

  const clearAnalysis = () => {
    setIsAnalyzing(false);
    setAnalysisReady(false);
    setAnalysisData(null);
  };

  const value = {
    isAnalyzing,
    analysisReady,
    analysisData,
    startAnalysis,
    finishAnalysis,
    clearAnalysis
  };

  return (
    <WeightCutAnalysisContext.Provider value={value}>
      {children}
    </WeightCutAnalysisContext.Provider>
  );
};
