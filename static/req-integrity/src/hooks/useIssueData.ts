import { useQuery } from '@tanstack/react-query';
import { invoke, view } from '@forge/bridge';

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

interface IssueData {
  issueId: string | null;
  issueKey: string | null;
  relationships: IssueRelationships;
}

async function fetchIssueData(): Promise<IssueData> {
  // Get issue ID from URL
  const history = await view.createHistory();
  const params = new URLSearchParams(history.location.search);
  const issueId = params.get('issueId');

  if (!issueId) {
    return {
      issueId: null,
      issueKey: null,
      relationships: {
        children: [],
        childrenDetails: [],
        summary: '',
        description: ''
      }
    };
  }

  // Get issue key from ID
  const issueData = await invoke('getIssueKey', { issueId });
  const issueKey = issueData.key;

  // Get relationship data
  const relationships = await invoke('getIssueRelationships', { issueKey });

  return {
    issueId,
    issueKey,
    relationships
  };
}

export function useIssueData() {
  return useQuery({
    queryKey: ['issueData'],
    queryFn: fetchIssueData,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });
}
