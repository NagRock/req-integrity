import { useState, useEffect } from 'react'
import { view, invoke } from '@forge/bridge';
import './App.css'

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
  const [issueId, setIssueId] = useState<string | null>(null);
  const [issueKey, setIssueKey] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<IssueRelationships>({
    children: [],
    childrenDetails: [],
    summary: '',
    description: ''
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get issueId using Forge router
    const getIssueIdFromUrl = async () => {
      try {
        const history = await view.createHistory();
        const params = new URLSearchParams(history.location.search);
        const id = params.get('issueId');
        setIssueId(id);

        if (id) {
          // Get issue key from the ID
          const issueData = await invoke('getIssueKey', { issueId: id });
          setIssueKey(issueData.key);

          // Get parent and child relationships
          const relationshipsData = await invoke('getIssueRelationships', { issueKey: issueData.key });
          setRelationships(relationshipsData);
        }
      } catch (error) {
        console.error('Error:', error);
        setError('Failed to load issue data. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    getIssueIdFromUrl();
  }, []);

  return (
    <div className="app-container">
      <h1>Requirement Integrity Analysis</h1>
      {loading ? (
        <p className="loading">Loading...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
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
              ) : (
                <p className="no-issues">No child issues found</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="error-message">No issue ID found in URL parameters.</p>
      )}
    </div>
  );
}

export default App
