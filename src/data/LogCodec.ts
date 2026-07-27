import { Codec, array, exactly, oneOf, string } from "purify-ts";

const status = oneOf([exactly("success"), exactly("failed")]);
const UserCodec = Codec.interface({ displayName: string, id: string, username: string });
const DatasetCodec = Codec.interface({ id: string });

export const D2LogsCodec = Codec.interface({
    action: string,
    datasets: array(DatasetCodec),
    date: string,
    status: status,
    user: UserCodec,
});
