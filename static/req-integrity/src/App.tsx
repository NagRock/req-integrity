import './App.css'
import { useIssueData } from './hooks/useIssueData';

interface ChildIssueDetail {
  key: string;
  summary: string;
}

interface IssueRelationships {
  parent?: string;
  children: string[];
  childrenDetails: ChildIssueDetail[];
  summary: string;
  description: string;
}

function App() {
  const { data, isLoading, error } = useIssueData();
  const issueId = data?.issueId;
  const issueKey = data?.issueKey;
  const relationships = data?.relationships || {
    children: [],
    childrenDetails: [],
    summary: '',
    description: ''
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

            {relationships.description && (
              <div className="issue-description">
                <h4>Description</h4>
                <div className="description-text">
                  {relationships.description}
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
        </div>
      ) : (
        <p className="error-message">No issue ID found in the URL.</p>
      )}
    </div>
  );
}

export default App
