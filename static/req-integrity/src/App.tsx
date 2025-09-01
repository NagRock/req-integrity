import { useState, useEffect } from 'react'
import { view } from '@forge/bridge';
import './App.css'

function App() {
  const [issueId, setIssueId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Get issueId using Forge router
    const getIssueIdFromUrl = async () => {
      try {
        const history = await view.createHistory();
        const params = new URLSearchParams(history.location.search);
        const id = params.get('issueId');
        setIssueId(id);
      } catch (error) {
        console.error('Error getting URL parameters:', error);
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
        <p>Loading...</p>
      ) : issueId ? (
        <div className="issue-details">
          <h2>Analyzing Issue ID: {issueId}</h2>
          <p>Analysis results for this issue will be displayed here.</p>
        </div>
      ) : (
        <p className="error-message">No issue ID found in URL parameters.</p>
      )}
    </div>
  );
}

export default App
