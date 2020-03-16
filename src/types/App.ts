export type OutputMessage_t = {
    topic: string;
    payload: string;
    ts: number;
};

export type Test_t = {
    cond: boolean;
    message: string;
};

export type Topics_t = {
    [x: string]: any;
    pattern: string;
};

export type Connection_t = {
    uuid: string;
    hostname: string;
    port: string;
    username: string;
    brokerPath: string;
    protocol: string;
    topics: { [key: string]: Topics_t };
};

export type OnChangeInputText = (field: string) => (e: any) => void;

export interface IMqcState {
    hostname: string;
    connections: Connection_t[];
    port: string;
    brokerPath: string;
    protocol: string;
    draft_topic: string;
    modal_topics: boolean;
    modal_settings: boolean;
    modal_create_connection: boolean;
    credentials: boolean;
    username: string;
    password: string;
    // todo: fix structure
    topics: { [key: string]: Topics_t };
    messages: OutputMessage_t[];
    running: boolean;

    /**
     * Enable this flag if messages should be parsed as json
     */
    settings_parse_messages: boolean;

    /**
     * Define the maximum number to use for displaying
     * incoming messages on the list
     */
    settings_max_messages: number;
}

export interface Settings_t {
    /**
     * Save this flag for initial setup.
     * When booting for the first time
     * the modal will be open
     */
    modal_create_connection: boolean;
    settings_max_messages: number;
}

export type SelectConnectionMethod = (c: Connection_t, cb?: () => void) => () => void;
export type DeleteConnectionMethod = (c: Connection_t) => () => void;
export type AddTopicMethod = (s: string) => void;
export type RemoveTopicMethod = (s: string) => void;
