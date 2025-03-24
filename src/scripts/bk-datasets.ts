import { command, run, string, option } from "cmd-ts";
import path from "path";
import { D2Api } from "$/types/d2-api";
import { writeFileSync } from "fs";
import _ from "$/domain/entities/generic/Collection";

/*
npx ts-node src/scripts/bk-datasets.ts -u 'http://172.16.2.1:8094' \
--username 'username' \
--password 'password' \
--folder="vpn" \
--data-set-ids="yKs33XBZhrn,ueTg0gsw13j,Tun5qeXUQHL,YKuivrjGGJL,HdHrdJXL2Gq,cNEG4mk1vyF,Kud1ZgtarKq,IDpR58hdUQC,lrUMdMtpwW2,wI49gD2fM9d,y5SLlj1xhWR,xtpOfx5AAx8,FTVHgYTP3z7,BA6WVCtdObv,srVcO2rolIt,fFvyjCYIe9q,HDNDFQ26xcK,sg3SPWiEMZE,jdlo6DpcX7H,nu348XQElQ8,gw1bDH0cBVU,qjbyWwITOmW,TR9ZXSzRif9,rQNW6Wfx9jv,rvmthIWQs4z,m7zWTy4Z1WG,sEbheCMYmhw,YCs9SlAjA9u,WIqxtquG7a3,CmYGmX44Uci,QC38bsQ2Rvq,rCrJ0IxNz3U,khEo0AJ8JpV,sLJJtK0AasR,ebQIGaUE81u,wQUx9k6TZLg,viCUgQC2269,AL6htqbKusn,pIlqDdQaU7f,eQmiVToD1pp,qnaeSzzs3Lm,hdB1hynhVgb,GZF20j2N34p,g93JLVE5ZmY,IVyhMjim9b2,KdUo5t7gwZn,zBiHbDV1TVB,ilhMirrf4dL,pBFfXQzaNGG,Vb76D89Y78G,U2PoNAr5aIf,lOl0jlNlvmb,MAkVsVSL3Tz,vE5m5CULm52,rfvflNu0mWK,wsXFaVXaqvZ,BG5lctiurO4,kdRTvoXCQOX,j0iq9dJvr4n,JxhWGsg61PT,IaAuteh4C38,NruJtdlY7hw,YlEvs6NHkvi,wYThEAG0kwB,tRFFGk8QTqi,oPuxsYMz6iY,ninZKUk6phJ,f3cjgqQZDs5,ywN27T8t8hD,Ao4zxbPQKUo,hBquJkasM7a,Mh3T4Db0Vzh,N1rh6sPfmD8,O3Nh2O9oOyv,sTkQJIDSLAV,agHnZviqpYL"
 */

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "Show DHIS2 instance info",
        args: {
            url: option({
                type: string,
                long: "dhis2-url",
                short: "u",
                description: "DHIS2 base URL. Example: http://USERNAME:PASSWORD@localhost:8080",
            }),
            username: option({
                type: string,
                long: "username",
                short: "s",
            }),
            password: option({
                type: string,
                long: "password",
                short: "p",
            }),
            dataSetIds: option({
                type: string,
                long: "data-set-ids",
                short: "d",
                description: "Comma separated list of dataSets ids",
            }),
            folder: option({
                type: string,
                long: "folder",
                short: "f",
                description: "Folder to save the output",
            }),
        },
        handler: async args => {
            const auth = { username: args.username, password: args.password };
            const api = new D2Api({ baseUrl: args.url, auth: auth });
            const dataSetIds = parseDataSetIds(args.dataSetIds);
            if (dataSetIds.length === 0) {
                console.error("Data sets ids are required");
                process.exit(1);
            }

            const responseDataSets = await api.models.dataSets
                .get({
                    fields: {
                        $owner: true,
                        dataEntryForm: { id: true, htmlCode: true },
                        sections: { $owner: true },
                    },
                    filter: { id: { in: dataSetIds } },
                    paging: false,
                })
                .getData();

            const newDataSets = responseDataSets.objects.map(d2DataSet => {
                return {
                    ...d2DataSet,
                    dataSetElements: _(d2DataSet.dataSetElements)
                        .orderBy([[x => x.dataElement.id, "asc"]])
                        .value(),
                    indicators: _(d2DataSet.indicators).orderBy([[x => x.id, "asc"]]).value,
                    totalSections: d2DataSet.sections.length,
                    totalDataElements: d2DataSet.dataSetElements.length,
                    totalIndicators: d2DataSet.indicators.length,
                    sectionsNames: _(d2DataSet.sections)
                        .map(x => x.name)
                        .sort()
                        .join(","),
                    sections: _(d2DataSet.sections)
                        .map(d2Section => {
                            return {
                                id: d2Section.id,
                                name: d2Section.name,
                                code: d2Section.code,
                                greyedFields: _(d2Section.greyedFields)
                                    .sortBy(x => x.id)
                                    .value(),
                                dataElements: _(d2Section.dataElements)
                                    .orderBy([[x => x.id, "asc"]])
                                    .value(),
                                indicators: _(d2Section.indicators)
                                    .orderBy([[x => x.id, "asc"]])
                                    .value(),
                                totalDataElements: d2Section.dataElements.length,
                                totalIndicators: d2Section.indicators.length,
                                sortOrder: d2Section.sortOrder,
                                showColumnTotals: d2Section.showColumnTotals,
                                showRowTotals: d2Section.showRowTotals,
                                totalGreyedFields: d2Section.greyedFields.length,
                            };
                        })
                        .orderBy([[x => x.name, "asc"]])
                        .value(),
                };
            });

            const sortById = _(newDataSets)
                .orderBy([[x => x.id, "asc"]])
                .value();

            sortById.forEach(dataSet => {
                const { dataEntryForm, ...rest } = dataSet;
                writeFileSync(
                    `${args.folder}/${dataSet.id}.json`,
                    JSON.stringify({ ...rest, dataEntryForm: { id: dataEntryForm.id } }, null, 2)
                );
                if (dataSet.dataEntryForm.htmlCode) {
                    writeFileSync(
                        `${args.folder}/${dataSet.id}_template.html`,
                        dataSet.dataEntryForm.htmlCode
                    );
                }
            });
        },
    });

    run(cmd, process.argv.slice(2));
}

function parseDataSetIds(dataSetsIds: string): string[] {
    return dataSetsIds.split(",").map(id => id.trim());
}

main();
