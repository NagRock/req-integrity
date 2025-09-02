import { useState } from 'react'
import './App.css'
import { useIssueData } from './hooks/useIssueData';
import { analyzeIssueIntegrity, MissingIssue } from './services/openai';
import { extractTextFromADF } from './utils/textUtils';
import { CreateIssueModal } from '@forge/jira-bridge';
import { view } from '@forge/bridge';

// Child issue component with expandable description
const ChildIssueItem = ({ issue }: { issue: { key: string; summary: string; issuetype?: string; description?: any } }) => {
  const [expanded, setExpanded] = useState(false);

  // Extract plain text from description if available
  const descriptionText = issue.description ? extractTextFromADF(issue.description) : '';

  return (
    <li key={issue.key} className="child-issue-item">
      <div className="child-issue-header" onClick={() => setExpanded(!expanded)}>
        <div>
          <div className="issue-key">{issue.key}</div>
          {issue.summary && <div className="child-issue-summary">{issue.summary}</div>}
        </div>
        <button
          className={`expand-button ${expanded ? 'expanded' : ''}`}
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          aria-label={expanded ? "Collapse issue details" : "Expand issue details"}
        >
          ▼
        </button>
      </div>
      <div className={`child-issue-details ${expanded ? 'expanded' : ''}`}>
        {issue.issuetype && <div><strong>Type:</strong> {issue.issuetype}</div>}
        {descriptionText ? (
          <div className="child-description">
            <strong>Description:</strong>
            <div className="description-text">{descriptionText}</div>
          </div>
        ) : (
          <div className="description-placeholder">
            No description available
          </div>
        )}
      </div>
    </li>
  );
};

// Missing Issues Suggestions component with Create Story button
const MissingIssuesSuggestions = ({
  missingIssues,
  parentIssueKey,
  onIssueCreated
}: {
  missingIssues: MissingIssue[];
  parentIssueKey: string;
  onIssueCreated: (issueKey: string) => void;
}) => {
  if (!missingIssues || missingIssues.length === 0) {
    return null;
  }

  const handleCreateIssue = async (issue: MissingIssue) => {
    try {
      // Use the Forge's CreateIssueModal
      const modal = new CreateIssueModal({
          context: {
              // Set initial values
              summary: issue.proposedSummary,
              // description: `${issue.rationale}`,
              // Set parent issue if applicable
              ...(parentIssueKey && {parentIssueKey}),
          },
          onClose: ({ payload }) => {
            if (payload[0] && payload[0].issueId) {
              onIssueCreated(payload[0].issueId);
            }
          }
      });

      await modal.open();

    } catch (error) {
      console.error('Error creating issue:', error);
    }
  };

  // Icon for Create Story button
  const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );

  return (
    <div className="missing-issues-container">
      <h3>Suggested Missing Issues</h3>
      <div className="missing-issues-list">
        {missingIssues.map((issue, index) => (
          <div key={index} className="missing-issue-item">
            <div className="missing-issue-summary">{issue.proposedSummary}</div>
            <div className="missing-issue-rationale">{issue.rationale}</div>
            <button
              className="create-story-button"
              onClick={() => handleCreateIssue(issue)}
            >
              <PlusIcon /> Create Issue
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

function App() {
  const { data, isLoading, error } = useIssueData();
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [missingIssues, setMissingIssues] = useState<MissingIssue[]>([]);
  const [createdIssues, setCreatedIssues] = useState<string[]>([]);

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
    setMissingIssues([]);
    setCreatedIssues([]);

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
        if (result.missingIssues && result.missingIssues.length > 0) {
          setMissingIssues(result.missingIssues);
        }
      }
    } catch (err) {
      setAnalysisError((err as Error).message || 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleIssueCreated = (issueKey: string) => {
    setCreatedIssues(prev => [...prev, issueKey]);
  };

  // Function to open issue in Jira
  const openIssue = (issueKey: string) => {
    view.navigate(`/browse/${issueKey}`);
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

          {/* Parent issue reference */}
          {relationships.parent && (
            <div className="parent-issue">
              <h3>Parent Issue:</h3>
              <div className="issue-key">{relationships.parent}</div>
            </div>
          )}

          {/* Horizontal layout container */}
          <div className="issue-content-container">
            {/* Main task container (left side) */}
            <div className="main-issue-container">
              <div className="issue-summary-container">
                <h3>Main Task</h3>
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
            </div>

            {/* Child issues container (right side) */}
            <div className="child-issues-container">
              <div className="child-issues">
                <h3>Child Issues</h3>
                {relationships.childrenDetails.length > 0 ? (
                  <ul className="issues-list">
                    {relationships.childrenDetails.map((child) => (
                      <ChildIssueItem key={child.key} issue={child} />
                    ))}
                  </ul>
                ) : (
                  <p>None</p>
                )}
              </div>
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

                {/* Display success notifications for created issues */}
                {createdIssues.length > 0 && (
                  <div className="success-notification">
                    <span>Created issue(s):</span>
                    {createdIssues.map((key, i) => (
                      <span key={i}>
                        {i > 0 && ', '}
                        <a href="#" onClick={() => openIssue(key)}>{key}</a>
                      </span>
                    ))}
                  </div>
                )}

                {/* Display missing issues suggestions with create buttons */}
                {missingIssues.length > 0 && (
                  <MissingIssuesSuggestions
                    missingIssues={missingIssues}
                    parentIssueKey={issueKey}
                    onIssueCreated={handleIssueCreated}
                  />
                )}
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
