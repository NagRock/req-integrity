import { useState, useEffect } from 'react'
import { view, invoke } from '@forge/bridge';
import './App.css'

interface IssueRelationships {
  parent?: string;
  children: string[];
}

function App() {
  const [issueId, setIssueId] = useState<string | null>(null);
  const [issueKey, setIssueKey] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<IssueRelationships>({ children: [] });
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

          <div className="relationships">
            {relationships.parent && (
              <div className="parent-issue">
                <h3>Parent Issue:</h3>
                <div className="issue-key">{relationships.parent}</div>
              </div>
            )}

            <div className="child-issues">
              <h3>Child Issues: {relationships.children.length > 0 ? '' : 'None'}</h3>
              {relationships.children.length > 0 ? (
                <ul className="issues-list">
                  {relationships.children.map((childKey) => (
                    <li key={childKey} className="issue-key">{childKey}</li>
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
