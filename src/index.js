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
    const relationships = {
        children: [],
        childrenDetails: [],
        summary: '',
        description: ''
    };

    try {
        // Get issue details including parent, summary and description
        const issueResponse = await api.asUser().requestJira(
            route`/rest/api/3/issue/${issueKey}?fields=parent,summary,description`
        );

        const issueData = await issueResponse.json();
        if (issueData.fields) {
            // Get parent if available
            if (issueData.fields.parent) {
                relationships.parent = issueData.fields.parent.key;
            }

            // Get summary and description
            relationships.summary = issueData.fields.summary || '';
            relationships.description = issueData.fields.description || '';
        }

        // Then get all children using the issueLink field with "is parent of" type
        const linksResponse = await api.asUser().requestJira(
            route`/rest/api/3/issue/${issueKey}?fields=issuelinks`
        );

        const linksData = await linksResponse.json();

        // Collection to track child keys we've already processed
        const childKeys = new Set();

        if (linksData.fields && linksData.fields.issuelinks) {
            // Process each issue link
            for (const link of linksData.fields.issuelinks) {
                // Check for outward links that represent child relationships
                if (link.outwardIssue && link.type && link.type.name === 'Parent/Child') {
                    childKeys.add(link.outwardIssue.key);
                    relationships.children.push(link.outwardIssue.key);
                }
                // Some Jira instances use different link types, so also check for subtask relationship
                else if (link.outwardIssue && link.type && link.type.name.toLowerCase().includes('subtask')) {
                    childKeys.add(link.outwardIssue.key);
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
                if (!childKeys.has(subtask.key)) {
                    childKeys.add(subtask.key);
                    relationships.children.push(subtask.key);
                }
            }
        }

        // Fetch details for each child issue
        if (relationships.children.length > 0) {
            for (const childKey of relationships.children) {
                try {
                    const childResponse = await api.asUser().requestJira(
                        route`/rest/api/3/issue/${childKey}?fields=summary`
                    );
                    const childData = await childResponse.json();

                    relationships.childrenDetails.push({
                        key: childKey,
                        summary: childData.fields && childData.fields.summary ? childData.fields.summary : ''
                    });
                } catch (childError) {
                    console.error(`Error fetching details for issue ${childKey}:`, childError);
                    // Add the key with an empty summary in case of error
                    relationships.childrenDetails.push({
                        key: childKey,
                        summary: ''
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error fetching issue relationships:', error);
    }

    return relationships;
});

export const handler = resolver.getDefinitions();
