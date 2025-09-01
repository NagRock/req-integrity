import React from "react";
import { router } from "@forge/bridge";

export function App() {
    const goToGlobal = async () => {
        const targetUrl = await router.getUrl({
            target: 'module',
            moduleKey: 'req-integrity-global-page',

        });
        targetUrl?.searchParams.set('issueId', 'blabla');

        if (targetUrl) {
            await router.navigate(targetUrl?.toString());
        }
    };

    return <button onClick={goToGlobal}>Analyse</button>;
}