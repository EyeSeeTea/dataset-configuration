// import { command, run, string, option } from "cmd-ts";
// import path from "path";
// import { D2Api, MetadataResponse } from "$/types/d2-api";
// import _ from "$/domain/entities/generic/Collection";
// import { apiToFuture } from "$/data/api-futures";
// import { FutureData } from "$/domain/entities/generic/Future";
// import { getErrorFromResponse } from "$/data/utils";

// /*
// npx ts-node src/scripts/bk-datasets.ts -u 'http://172.16.2.1:8094' \
// --username 'username' \
// --password 'password' \
// --folder="vpn" \
// --data-set-ids="yKs33XBZhrn,ueTg0gsw13j,Tun5qeXUQHL,YKuivrjGGJL,HdHrdJXL2Gq,cNEG4mk1vyF,Kud1ZgtarKq,IDpR58hdUQC,lrUMdMtpwW2,wI49gD2fM9d,y5SLlj1xhWR,xtpOfx5AAx8,FTVHgYTP3z7,BA6WVCtdObv,srVcO2rolIt,fFvyjCYIe9q,HDNDFQ26xcK,sg3SPWiEMZE,jdlo6DpcX7H,nu348XQElQ8,gw1bDH0cBVU,qjbyWwITOmW,TR9ZXSzRif9,rQNW6Wfx9jv,rvmthIWQs4z,m7zWTy4Z1WG,sEbheCMYmhw,YCs9SlAjA9u,WIqxtquG7a3,CmYGmX44Uci,QC38bsQ2Rvq,rCrJ0IxNz3U,khEo0AJ8JpV,sLJJtK0AasR,ebQIGaUE81u,wQUx9k6TZLg,viCUgQC2269,AL6htqbKusn,pIlqDdQaU7f,eQmiVToD1pp,qnaeSzzs3Lm,hdB1hynhVgb,GZF20j2N34p,g93JLVE5ZmY,IVyhMjim9b2,KdUo5t7gwZn,zBiHbDV1TVB,ilhMirrf4dL,pBFfXQzaNGG,Vb76D89Y78G,U2PoNAr5aIf,lOl0jlNlvmb,MAkVsVSL3Tz,vE5m5CULm52,rfvflNu0mWK,wsXFaVXaqvZ,BG5lctiurO4,kdRTvoXCQOX,j0iq9dJvr4n,JxhWGsg61PT,IaAuteh4C38,NruJtdlY7hw,YlEvs6NHkvi,wYThEAG0kwB,tRFFGk8QTqi,oPuxsYMz6iY,ninZKUk6phJ,f3cjgqQZDs5,ywN27T8t8hD,Ao4zxbPQKUo,hBquJkasM7a,Mh3T4Db0Vzh,N1rh6sPfmD8,O3Nh2O9oOyv,sTkQJIDSLAV,agHnZviqpYL"
//  */

// function main() {
//     const cmd = command({
//         name: path.basename(__filename),
//         description: "Show DHIS2 instance info",
//         args: {
//             url: option({
//                 type: string,
//                 long: "dhis2-url",
//                 short: "u",
//                 description: "DHIS2 base URL. Example: http://USERNAME:PASSWORD@localhost:8080",
//             }),
//             username: option({
//                 type: string,
//                 long: "username",
//                 short: "s",
//             }),
//             password: option({
//                 type: string,
//                 long: "password",
//                 short: "p",
//             }),
//         },
//         handler: args => {
//             const auth = { username: args.username, password: args.password };
//             const api = new D2Api({ baseUrl: args.url, auth: auth });

//             postDataSet(api).run(console.log, console.error);
//             /*
//               npx ts-node src/scripts/update-project-access.ts -u 'http://DESKTOP-I6DTCCV.local:8080' \
//               --username 'bao-admin' --password 'EsT@Staging1234!'
//             */
//         },
//     });

//     run(cmd, process.argv.slice(2));
// }

// function postDataSet(api: D2Api): FutureData<void> {
//     /*
//   api.metadata.post({
//             dataSets: [
//                 {
//                     name: "name",
//                     shortName: "MORE_THAN_50_CHARS_SHORT_NAME_____________________________________",
//                 },
//             ],
//         })

//         api.models.dataSets.post({
//             name: "name",
//             shortName: "MORE_THAN_50_CHARS_SHORT_NAME_____________________________________",
//         })
//    */
//     return apiToFuture(
//         api.metadata.post({
//             dataSets: [
//                 {
//                     name: "name",
//                     shortName: "MORE_THAN_50_CHARS_SHORT_NAME_____________________________________",
//                 },
//             ],
//         })
//     )
//         .map(_response => {
//             console.log("success");
//         })
//         .mapError(err => {
//             const error = err as unknown as MapError;
//             const errorResponse = error?.response?.data?.response;
//             if (!errorResponse) throw new Error(err.message ?? "Unknown error");

//             const errorMessage = getErrorFromResponse(errorResponse);
//             console.log("error metadata: ", errorMessage);

//             process.exit(1);
//         });
// }

// type MapError = {
//     response: MapErroResponse;
// };

// type MapErroResponse = {
//     data: ErrorResponse | undefined;
// };

// type ErrorResponse = {
//     response: MetadataResponse;
//     // response: MetadataResponse | { errorReports: ErrorReport[] };
// };

// main();
