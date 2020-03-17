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
};

export type Connection_t = {
    connection_uuid: string;
    connection_name?: string;
    connection_hostname: string;
    connection_port: string;
    connection_use_credentials: boolean;
    connection_username: string;
    connection_password: string;
    connection_brokerPath: string;
    connection_protocol: string;
    connection_topics: { [key: string]: Topics_t };
};

export type OnChangeInputTextFunction = (e) => void;

export interface IMqcState extends Connection_t, Settings_t {
    state_connections_list: Connection_t[];
    state_draft_topic: string;
    state_modal_topics: boolean;
    state_modal_settings: boolean;
    state_modal_create_connection: boolean;
    state_messages_list: OutputMessage_t[];
    state_client_running: boolean;
}

export interface Settings_t {
    /**
     * Define the maximum number to use for displaying
     * incoming messages on the list
     */
    settings_max_messages: number;
    /**
     * Enable this flag if messages should be parsed as json
     */
    settings_parse_json: boolean;
}

export type SelectConnectionMethod = (c: Connection_t, cb?: () => void) => () => void;
export type DeleteConnectionMethod = (c: Connection_t) => () => void;
export type AddTopicMethod = () => void;
export type RemoveTopicMethod = (s: string) => void;
