import { useState } from 'react'
import './App.css'
import { useIssueData } from './hooks/useIssueData';
import { analyzeIssueIntegrity } from './services/openai';
import { extractTextFromADF } from './utils/textUtils';

function App() {
  const { data, isLoading, error } = useIssueData();
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const issueId = data?.issueId;
  const issueKey = data?.issueKey;
  const relationships = data?.relationships || {
    children: [],
    childrenDetails: [],
    summary: '',
    description: ''
  };

  // Extract plain text from the description
  const descriptionText = extractTextFromADF(relationships.description);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult('');

    try {
      const result = await analyzeIssueIntegrity(
        relationships.summary,
        descriptionText, // Use the extracted plain text
        relationships.childrenDetails
      );

      if (result.error) {
        setAnalysisError(result.error);
      } else {
        setAnalysisResult(result.content);
      }
    } catch (err) {
      setAnalysisError((err as Error).message || 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app-container">
      <h1>Requirement Integrity Analysis</h1>
      {isLoading ? (
        <p className="loading">Loading...</p>
      ) : error ? (
        <p className="error-message">{(error as Error).message || 'Failed to load issue data. Please check your connection and try again.'}</p>
      ) : issueId && issueKey ? (
        <div className="issue-details">
          <h2>Analyzing Issue: {issueKey}</h2>

          <div className="issue-summary-container">
            <h3>Summary</h3>
            <p className="issue-summary">{relationships.summary}</p>

            {descriptionText && (
              <div className="issue-description">
                <h4>Description</h4>
                <div className="description-text">
                  {descriptionText}
                </div>
              </div>
            )}
          </div>

          <div className="relationships">
            {relationships.parent && (
              <div className="parent-issue">
                <h3>Parent Issue:</h3>
                <div className="issue-key">{relationships.parent}</div>
              </div>
            )}

            <div className="child-issues">
              <h3>Child Issues: {relationships.childrenDetails.length > 0 ? '' : 'None'}</h3>
              {relationships.childrenDetails.length > 0 ? (
                <ul className="issues-list">
                  {relationships.childrenDetails.map((child) => (
                    <li key={child.key} className="child-issue-item">
                      <div className="issue-key">{child.key}</div>
                      {child.summary && <div className="child-issue-summary">{child.summary}</div>}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          <div className="analysis-section">
            <button
              className="analyze-button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !relationships.summary}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyse Requirements'}
            </button>

            {analysisError && (
              <div className="error-message">
                <p>Analysis Error: {analysisError}</p>
              </div>
            )}

            {analysisResult && (
              <div className="analysis-results">
                <h3>Requirement Analysis</h3>
                <div className="analysis-content">
                  {analysisResult.split('\n').map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="error-message">No issue ID found in the URL.</p>
      )}
    </div>
  );
}

export default App
