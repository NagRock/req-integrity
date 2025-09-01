import Resolver from '@forge/resolver';
import api, { route } from '@forge/api';

const resolver = new Resolver();

resolver.define('getText', (req) => {
    console.log(req);

    return 'Hello, world!';
});

// Function to get issue key from issue ID
resolver.define('getIssueKey', async ({ payload }) => {
    const { issueId } = payload;

    // Call the Jira API to get issue information
    const response = await api.asUser().requestJira(
        route`/rest/api/3/issue/${issueId}`
    );

    const data = await response.json();
    return { key: data.key };
});

// Function to get parent and child issue relationships
resolver.define('getIssueRelationships', async ({ payload }) => {
    const { issueKey } = payload;
    const relationships = { children: [] };

    try {
        // First, check if the issue has a parent (using the parent field)
        const issueResponse = await api.asUser().requestJira(
            route`/rest/api/3/issue/${issueKey}?fields=parent`
        );

        const issueData = await issueResponse.json();
        if (issueData.fields && issueData.fields.parent) {
            relationships.parent = issueData.fields.parent.key;
        }

        // Then get all children using the issueLink field with "is parent of" type
        const linksResponse = await api.asUser().requestJira(
            route`/rest/api/3/issue/${issueKey}?fields=issuelinks`
        );

        const linksData = await linksResponse.json();

        if (linksData.fields && linksData.fields.issuelinks) {
            // Process each issue link
            for (const link of linksData.fields.issuelinks) {
                // Check for outward links that represent child relationships
                if (link.outwardIssue && link.type && link.type.name === 'Parent/Child') {
                    relationships.children.push(link.outwardIssue.key);
                }
                // Some Jira instances use different link types, so also check for subtask relationship
                else if (link.outwardIssue && link.type && link.type.name.toLowerCase().includes('subtask')) {
                    relationships.children.push(link.outwardIssue.key);
                }
            }
        }

        // Also check for subtasks which might be represented differently
        const subtasksResponse = await api.asUser().requestJira(
            route`/rest/api/3/issue/${issueKey}?fields=subtasks`
        );

        const subtasksData = await subtasksResponse.json();
        if (subtasksData.fields && subtasksData.fields.subtasks) {
            for (const subtask of subtasksData.fields.subtasks) {
                if (!relationships.children.includes(subtask.key)) {
                    relationships.children.push(subtask.key);
                }
            }
        }
    } catch (error) {
        console.error('Error fetching issue relationships:', error);
    }

    return relationships;
});

export const handler = resolver.getDefinitions();
