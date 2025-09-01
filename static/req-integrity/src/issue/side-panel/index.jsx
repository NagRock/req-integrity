import React from "react";
import { createRoot } from "react-dom/client";
import { router } from "@forge/bridge";

function IssueContextPane() {
    const goToGlobal = async () => {
        const url = await router.getUrl({
            target: "module",
            moduleKey: "reqval-global-page",
        });
        await router.navigate(url);
    };

    return <button onClick={goToGlobal}>Analyse</button>;
}

const root = createRoot(document.getElementById("root"));
root.render(<IssueContextPane />);