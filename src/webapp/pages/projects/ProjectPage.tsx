import React from "react";
import { HomeTabs } from "$/webapp/components/home-tabs/HomeTabs";
import { ProjectTable } from "$/webapp/components/projects/ProjectTable";

export const ProjectPage: React.FC = React.memo(() => {
    return (
        <section>
            <HomeTabs activeTab="projects" />
            <ProjectTable />
        </section>
    );
});
