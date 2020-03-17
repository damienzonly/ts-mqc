import React from "react";
import mqtt, { MqttClient, IClientOptions, OnMessageCallback } from "mqtt";
import { message, Switch, Row, Col, Modal } from "antd";
import validator from "validator";
import "antd/dist/antd.css";
import { outer_frame } from "./style/app.style";
import { LocalStorage } from "./lib/LocalStorage";
import { LSKEY_CONNECTIONS, MQC_MAX_MESSAGES_LENGTH, LSKEY_SETTINGS } from "./lib/constants";
import {
    IMqcState,
    Connection_t,
    Test_t,
    OutputMessage_t,
    OnChangeInputTextFunction,
    DeleteConnectionMethod,
    SelectConnectionMethod,
    Settings_t,
    AddTopicMethod,
    RemoveTopicMethod
} from "./types/App";
import "font-awesome/css/font-awesome.min.css";
import { CredentialsForm } from "./components/CredentialsForm";
import { v4 as uuid } from "uuid";
import { BrokerForm } from "./components/BrokerForm";
import { ButtonsBar } from "./components/ButtonsBar";
import { RecentConnections } from "./components/RecentConnections";
import { TopicsForm } from "./components/TopicsForm";
import { OutputDisplay } from "./components/OutputDisplay";
import { SettingsModal } from "./components/SettingsModal";
import _ from "lodash";
message.config({ duration: 2 });

const ls = new LocalStorage();
// todo: write readme documentation
export default class App extends React.Component<any, IMqcState> {
    state = {
        // app properties
        state_connections_list: [],
        state_draft_topic: "",
        state_modal_topics: false,
        state_modal_settings: false,
        state_modal_create_connection: false,
        state_messages_list: [],
        state_client_running: false,

        // settings
        settings_max_messages: MQC_MAX_MESSAGES_LENGTH,
        settings_parse_json: true,

        // connection
        connection_uuid: "", // unused in state
        connection_name: "",
        connection_hostname: "",
        connection_port: "",
        connection_use_credentials: false,
        connection_username: "",
        connection_password: "",
        connection_brokerPath: "",
        connection_protocol: "",
        connection_topics: {}
    };

    private client: MqttClient;

    private _resetStateConnection = () => {
        this.setState({
            connection_uuid: "",
            connection_name: "",
            connection_hostname: "",
            connection_port: "",
            connection_use_credentials: false,
            connection_username: "",
            connection_password: "",
            connection_brokerPath: "",
            connection_protocol: "",
            connection_topics: {}
        });
    };

    private onChange_connection_name = e => {
        this.setState({ connection_name: e.target.value });
    };
    private onChange_connection_hostname = e => {
        this.setState({ connection_hostname: e.target.value });
    };
    private onChange_connection_port = e => {
        this.setState({ connection_port: e.target.value });
    };
    private onChange_connection_use_credentials = v => {
        this.setState({ connection_use_credentials: v });
    };
    private onChange_connection_username = e => {
        this.setState({ connection_username: e.target.value });
    };
    private onChange_connection_password = e => {
        this.setState({ connection_password: e.target.value });
    };
    private onChange_connection_brokerPath = e => {
        this.setState({ connection_brokerPath: e.target.value });
    };

    private onChange_state_draft_topic = e => {
        this.setState({ state_draft_topic: e.target.value });
    };

    private onChange_settings_parse_json = v => {
        this.setState({ settings_parse_json: v });
    };
    private onChange_settings_max_messages = e => {
        const settings_max_messages = e.target.value;
        const state_messages_list = this.state.state_messages_list.slice(0, +settings_max_messages);
        this.setState({ state_messages_list, settings_max_messages });
    };

    private _clearMessages = () => {
        this.setState({ state_messages_list: [] })
    }

    private _saveAll = () => {
        this._saveSettings();
        this._saveConnections();
    };

    private _saveSettings = () => {
        const settings: Settings_t = {
            settings_max_messages: this.state.settings_max_messages,
            settings_parse_json: this.state.settings_parse_json
        };
        ls.set(LSKEY_SETTINGS, settings);
    };

    private _saveConnections = () => {
        ls.set(LSKEY_CONNECTIONS, this.state.state_connections_list);
    };

    private createOrUpdateConnection = () => {
        // todo: validate state
        const connection: Connection_t = this._getConnectionFromState();
        const state_connections: Connection_t[] = _.cloneDeep(this.state.state_connections_list);
        const foundConnIdx = _.findIndex(
            state_connections,
            (c: Connection_t) => c.connection_uuid === connection.connection_uuid
        );
        if (foundConnIdx !== -1) {
            _.assign(state_connections[foundConnIdx], connection);
        } else {
            state_connections.unshift(connection);
        }
        this.setState({ state_connections_list: state_connections });
        ls.set(LSKEY_CONNECTIONS, state_connections);
    };

    start = () => {
        try {
            this._validateConnectionFromState();
            this.stopClient();
            this.initializeClient();
            this.setRunning();
            this._saveAll();
            this.close_modal_createConnection();
        } catch (e) {
            message.error(e.toString());
            this.unsetRunning();
        }
    };

    stop = () => {
        this.unsetRunning();
        this.stopClient();
    };

    private setRunning = () => {
        this.setState({ state_client_running: true });
    };

    private unsetRunning = () => {
        this.setState({ state_client_running: false });
    };

    componentDidMount = () => {
        this.stop();
        const connections = ls.get(LSKEY_CONNECTIONS);
        if (connections !== null && Array.isArray(connections) && connections.length) {
            this.setState({ state_connections_list: connections });
        } else {
            this.open_modal_createConnection();
        }
        const settings: Settings_t = ls.get(LSKEY_SETTINGS);
        if (settings) {
            this.setState(settings);
        } else {
            const initSettings: Settings_t = {
                settings_max_messages: this.state.settings_max_messages,
                settings_parse_json: this.state.settings_parse_json
            };
            ls.set(LSKEY_SETTINGS, initSettings);
        }
        this.unsetRunning();
    };

    componentWillUnmount = () => {
        this.stop();
    };

    private stopClient = () => {
        if (this.client) {
            this.client.end();
        }
    };

    /**
     * Used when the user enables the message parsing
     * flag in the app settings
     */
    private handleJSONMessage: OnMessageCallback = (topic, message, packet) => {
        const msg = message.toString();
        let payload;
        try {
            const parsed = JSON.parse(msg);
            payload = JSON.stringify(parsed, null, 4);
        } catch (e) {
            payload = msg;
        }
        this.addMessage({ topic, payload, ts: Date.now() });
    };

    /**
     * Used when the user disables the message parsing
     * flag in the app settings
     */
    private handlePlainMessage: OnMessageCallback = (topic, message) => {
        this.addMessage({ topic, payload: message.toString(), ts: Date.now() });
    };

    private initializeClient = () => {
        const opts: IClientOptions = {};
        if (this.state.connection_use_credentials) {
            opts.username = this.state.connection_username;
            opts.password = this.state.connection_password;
        }
        const uri = ` ws://${this.state.connection_hostname}:${this.state.connection_port}${this.state.connection_brokerPath}`;
        this.client = mqtt.connect(uri, opts);
        this.client
            .on("message", (topic, message, packet) => {
                // todo: add json flag configuration to avoid parsing when unnecessary
                if (this.state.settings_parse_json) {
                    setImmediate(() => this.handleJSONMessage(topic, message, packet));
                } else {
                    setImmediate(() => this.handlePlainMessage(topic, message, packet));
                }
            })
            .on("connect", () => {
                message.success(`Connected to ${this.state.connection_hostname}`);
            })
            .on("end", () => {
                message.info(`Connection to ${this.state.connection_hostname} closed`);
            })
            .on("offline", () => {
                message.error("Connection went offline");
            });
        Object.keys(this.state.connection_topics).forEach(topic => {
            this.client.subscribe(topic);
        });
    };

    onChange: OnChangeInputTextFunction = prop => e => {
        const newState = {};
        newState[prop] = e.target.value;
        this.setState(newState);
    };

    private close_modal_topics = () => {
        this.setState({ state_modal_topics: false });
    };

    private open_modal_topics = () => {
        this.setState({ state_modal_topics: true });
    };

    private close_modal_settings = () => {
        this.setState({ state_modal_settings: false });
    };

    private open_modal_settings = () => {
        this.setState({ state_modal_settings: true });
    };

    private close_modal_createConnection = () => {
        this.setState({ state_modal_create_connection: false });
    };

    private open_modal_createConnection = () => {
        this.setState({ state_modal_create_connection: true });
    };

    private open_modal_createConnectionAndResetStateConnection = () => {
        this.open_modal_createConnection();
        this.setState({ state_modal_create_connection: true });
    };


    private close_modal_createConnectionAndResetStateConnection = () => {
        this.close_modal_createConnection();
        this._resetStateConnection();
    };

    private credentialsSwitch = () => {
        return (
            <Switch
                disabled={this.state.state_client_running}
                style={{ margin: 10, marginBottom: 20, marginLeft: 0 }}
                onChange={this.onChange_connection_use_credentials}
                checked={this.state.connection_use_credentials}
            />
        );
    };

    private modal_settings = () => {
        return (
            <>
                <SettingsModal
                    onMessagesNumberChange={this.onChange_settings_max_messages}
                    messages_number={this.state.settings_max_messages}
                    visible={this.state.state_modal_settings}
                    onOk={() => {
                        this.close_modal_settings();
                        this._saveSettings()
                    }}
                    onCancel={this.close_modal_settings}
                    checked={this.state.settings_parse_json}
                    onChange={this.onChange_settings_parse_json}
                />
            </>
        );
    };

    private brokerForm = () => {
        return (
            <BrokerForm
                hostname={this.state.connection_hostname}
                running={this.state.state_client_running}
                port={this.state.connection_port}
                brokerPath={this.state.connection_brokerPath}
                connection_name={this.state.connection_name}
                onChange_connection_name={this.onChange_connection_name}
                onChange_connection_hostname={this.onChange_connection_hostname}
                onChange_connection_port={this.onChange_connection_port}
                onChange_connection_brokerPath={this.onChange_connection_brokerPath}
            />
        );
    };

    private modal_createConnection = () => {
        return (
            <>
                <Modal
                    onOk={() => {
                        this.createOrUpdateConnection();
                        this.close_modal_createConnectionAndResetStateConnection();
                    }}
                    okText={"Save"}
                    onCancel={this.close_modal_createConnection}
                    visible={this.state.state_modal_create_connection}
                >
                    <h2> Connection configuration </h2>
                    {this.brokerForm()}
                    <h3> Use Credentials </h3>
                    {this.credentialsSwitch()}
                    {this.state.connection_use_credentials ? this.credentialsForm() : <div />}
                    {/* {this.buttonsBar()} */}
                    {this.topicsForm()}
                </Modal>
            </>
        );
    };

    private topicsForm = () => {
        return (
            <TopicsForm
                topics={this.state.connection_topics}
                draft_topic={this.state.state_draft_topic}
                onChange_state_draft_topic={this.onChange_state_draft_topic}
                addTopic={this.addTopic}
                removeTopic={this.removeTopic}
                modal_topics={this.state.state_modal_topics}
                onOk={this.close_modal_topics}
                onCancel={this.close_modal_topics}
            />
        );
    };

    private credentialsForm = () => {
        return (
            <CredentialsForm
                running={this.state.state_client_running}
                onChange_connection_brokerPath={this.onChange_connection_brokerPath}
                onChange_connection_password={this.onChange_connection_password}
                onChange_connection_username={this.onChange_connection_username}
                password={this.state.connection_password}
                username={this.state.connection_username}
            />
        );
    };

    private buttonsBar = () => {
        return (
            <ButtonsBar
                save={this.createOrUpdateConnection}
                open_modal_topics={this.open_modal_topics}
                open_modal_settings={this.open_modal_settings}
                running={this.state.state_client_running}
                start={this.start}
                stop={this.stop}
                modal_topics={this.state.state_modal_topics}
            />
        );
    };

    private addMessage = (message: OutputMessage_t) => {
        const messages: OutputMessage_t[] = [...this.state.state_messages_list].slice(
            0,
            this.state.settings_max_messages - 1
        );
        messages.unshift(message);
        this.setState({ state_messages_list: messages });
    };

    private _getConnectionFromState = () => {
        return {
            connection_uuid: this.state.connection_uuid || uuid(),
            connection_name: this.state.connection_name,
            connection_hostname: this.state.connection_hostname,
            connection_port: this.state.connection_port,
            connection_use_credentials: this.state.connection_use_credentials,
            connection_username: this.state.connection_username,
            connection_password: this.state.connection_password,
            connection_brokerPath: this.state.connection_brokerPath,
            connection_protocol: this.state.connection_protocol,
            connection_topics: this.state.connection_topics
        };
    };

    private _validateConnectionFromState = () => {
        const tests: Test_t[] = [
            { cond: !!this.state.connection_name, message: "Connection name is empty" },
            { cond: !!this.state.connection_hostname, message: "Hostname is empty" },
            { cond: validator.isPort(this.state.connection_port), message: "Port is not valid" },
            {
                // if the flag is enabled check validity of credentials
                cond:
                    !this.state.connection_use_credentials ||
                    (!!this.state.connection_username && !!this.state.connection_password),
                message: "Credentials are not set properly"
            }
        ];

        for (const { cond, message } of tests) {
            if (!cond) throw message;
        }
    };

    private addTopic: AddTopicMethod = () => {
        if (!this.state.state_draft_topic) return;
        const connection = this._getConnectionFromState();
        this.setState(connection);
        const topic = this.state.state_draft_topic;
        const newTopicOjb = { [topic]: {} };
        const connections_list: Connection_t[] = _.cloneDeep(this.state.state_connections_list);
        const foundConnectionIndex = _.findIndex(
            connections_list,
            (c: Connection_t) => c.connection_uuid === connection.connection_uuid
        );
        if (foundConnectionIndex !== -1) {
            _.assign(connections_list[foundConnectionIndex].connection_topics, newTopicOjb);
        } else {
            connections_list.unshift(connection);
        }
        _.assign(connection.connection_topics, newTopicOjb);
        // finally subscribe to the new topic
        if (this.client) {
            this.client.subscribe(topic);
        }
        this.setState({ state_draft_topic: "" });
    };

    private removeTopic: RemoveTopicMethod = topic => {
        const connection = this._getConnectionFromState();
        const connections_list: Connection_t[] = _.cloneDeep(this.state.state_connections_list);
        const connIdx = _.findIndex(
            connections_list,
            (c: Connection_t) => c.connection_uuid === connection.connection_uuid
        );
        if (connIdx !== -1) {
            delete connections_list[connIdx].connection_topics[topic];
            delete connection.connection_topics[topic];
            this.setState({ ...connection, state_connections_list: connections_list });
            // finally unsubscribe to the topic
            if (this.client) {
                this.client.unsubscribe(topic);
            }
        }
    };

    private selectConnection: SelectConnectionMethod = (connection, cb) => () => {
        const conn = _.find(
            this.state.state_connections_list,
            (c: Connection_t) => c.connection_uuid === connection.connection_uuid
        );
        if (conn) {
            this.setState(
                {
                    connection_uuid: conn.connection_uuid,
                    connection_name: conn.connection_name,
                    connection_hostname: conn.connection_hostname,
                    connection_port: conn.connection_port,
                    connection_use_credentials: conn.connection_use_credentials,
                    connection_username: conn.connection_username,
                    connection_password: conn.connection_password,
                    connection_brokerPath: conn.connection_brokerPath,
                    connection_protocol: conn.connection_protocol,
                    connection_topics: conn.connection_topics
                },
                cb
            );
        }
    };

    private deleteConnection: DeleteConnectionMethod = connection => () => {
        const connections = _.filter(
            this.state.state_connections_list,
            (c: Connection_t) => connection.connection_uuid !== c.connection_uuid
        );
        this.setState({ state_connections_list: connections });
        ls.set(LSKEY_CONNECTIONS, connections);
    };

    render = () => {
        console.clear();
        console.log(JSON.stringify(this.state, null, 4));
        return (
            <div style={outer_frame}>
                {this.modal_settings()}
                {this.modal_createConnection()}
                <Row gutter={50}>
                    <Col span={10}>
                        <RecentConnections
                            clearMessagesFunction={this._clearMessages}
                            start={this.start}
                            stop={this.stop}
                            running={this.state.state_client_running}
                            connections={this.state.state_connections_list}
                            selectConnection={this.selectConnection}
                            deleteConnection={this.deleteConnection}
                            open_modal_connection={this.open_modal_createConnection}
                            close_modal_connection={this.close_modal_createConnection}
                            open_modal_settings={this.open_modal_settings}
                        />
                    </Col>
                    <Col span={14}>
                        <OutputDisplay
                            running={this.state.state_client_running}
                            messages={this.state.state_messages_list}
                        />
                    </Col>
                </Row>
            </div>
        );
    };
}
