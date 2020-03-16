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
    OnChangeInputText,
    DeleteConnectionMethod,
    SelectConnectionMethod,
    Settings_t
} from "./types/App";
import "font-awesome/css/font-awesome.min.css";
import { CredentialsForm } from "./components/CredentialsForm";
import { v4 as uuid } from "uuid";
import { BrokerForm } from "./components/BrokerForm";
import { ButtonsBar } from "./components/ButtonsBar";
import { RecentConnections } from "./components/RecentConnections";
import { TopicsModal } from "./components/TopicsModal";
import { OutputDisplay } from "./components/OutputDisplay";
import { SettingsModal } from "./components/SettingsModal";
const ls = new LocalStorage();
// todo: write readme documentation
export default class App extends React.Component<any, IMqcState> {
    state = {
        hostname: "",
        port: "",
        connections: [],
        username: "",
        brokerPath: "/mqtt",
        password: "",
        protocol: "ws",
        draft_topic: "",
        modal_topics: false,
        modal_settings: false,
        modal_create_connection: false,
        topics: {},
        messages: [],
        running: false,
        credentials: false,
        settings_parse_messages: false,
        settings_max_messages: MQC_MAX_MESSAGES_LENGTH
    };

    private client: MqttClient;

    /**
     * This method will save the following state properties
     * in the connections key of localstorage:
     * **hostname**, **brokerPath**, **port**, **protocol**,
     * **topics**, **username**, **modal_create_connection**
     */
    private saveAll = () => {
        // todo: update configuration found if existent and similar to the current
        this.saveSettings();
        this.saveConnection();
    };

    private saveSettings = () => {
        const settings: Settings_t = {
            modal_create_connection: this.state.modal_create_connection,
            settings_max_messages: this.state.settings_max_messages
        };
        ls.set(LSKEY_SETTINGS, settings);
        message.success("Settings Saved");
    };

    private saveConnection = () => {
        const hostname = this.state.hostname;
        const port = this.state.port;
        const protocol = this.state.protocol;
        if (!hostname || !port || !protocol) return;
        const connection: Connection_t = {
            uuid: uuid(),
            hostname: this.state.hostname,
            brokerPath: this.state.brokerPath,
            port: this.state.port,
            protocol: this.state.protocol,
            topics: this.state.topics,
            username: this.state.username
        };
        const saved_connections = ls.get(LSKEY_CONNECTIONS);
        if (saved_connections) {
            // save only if a similar configuration doesn't exist
            const similarConnections: Connection_t[] = saved_connections.filter(this.getSimilarConnections);
            if (!similarConnections.length) {
                saved_connections.unshift(connection);
                ls.set(LSKEY_CONNECTIONS, saved_connections);
                this.setState({ connections: saved_connections });
            }
        } else {
            ls.set(LSKEY_CONNECTIONS, [connection]);
            this.setState({ connections: [connection] });
        }
        message.success("Connection Saved");
    };

    private validateState = () => {
        const tests: Test_t[] = [
            { cond: !!this.state.protocol, message: "Protocol is missing (ws | mqtt)" },
            { cond: !!this.state.hostname, message: "Hostname is empty" },
            { cond: validator.isPort(this.state.port), message: "Port is not valid" },
            {
                cond: !this.state.credentials || (!!this.state.username && !!this.state.password),
                message: "Credentials are not set properly"
            }
        ];

        for (const { cond, message } of tests) {
            if (!cond) throw message;
        }
    };

    start = () => {
        try {
            this.validateState();
            this.stopClient();
            this.initializeClient();
            this.setRunning();
            // save current configuration as a new connection record
            this.saveAll();
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
        this.setState({ running: true });
    };

    private unsetRunning = () => {
        this.setState({ running: false });
    };

    // todo: settings modal
    private modal_settings = () => {
        return (
            <SettingsModal
                saveSettings={this.saveSettings}
                onMessagesNumberChange={this.onChangeSettingsMaxMessages}
                messages_number={this.state.settings_max_messages}
                visible={this.state.modal_settings}
                onOk={this.close_modal_settings}
                onCancel={this.close_modal_settings}
                checked={this.state.settings_parse_messages}
                onChange={this.onChangeSwitch("settings_parse_messages")}
            />
        );
    };

    componentDidMount = () => {
        this.stop();
        const connections = ls.get(LSKEY_CONNECTIONS);
        if (connections !== null && Array.isArray(connections) && connections.length) {
            this.setState({ connections });
        }
        const settings: Settings_t = ls.get(LSKEY_SETTINGS);
        if (settings) {
            this.setState(settings);
        } else {
            const initSettings: Settings_t = {
                modal_create_connection: this.state.modal_create_connection,
                settings_max_messages: this.state.settings_max_messages
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
        if (this.state.credentials) {
            opts.username = this.state.username;
            opts.password = this.state.password;
        }
        const uri = `${this.state.protocol}://${this.state.hostname}:${this.state.port}${this.state.brokerPath}`;
        this.client = mqtt.connect(uri, opts);
        this.client
            .on("message", (topic, message, packet) => {
                // todo: add json flag configuration to avoid parsing when unnecessary
                if (this.state.settings_parse_messages) {
                    setImmediate(() => this.handleJSONMessage(topic, message, packet));
                } else {
                    setImmediate(() => this.handlePlainMessage(topic, message, packet));
                }
            })
            .on("connect", () => {
                message.success(`Connected to ${this.state.hostname}`);
            })
            .on("end", () => {
                message.info(`Connection to ${this.state.hostname} closed`);
            })
            .on("offline", () => {
                message.error("Could not connect to broker");
            });
        Object.keys(this.state.topics).forEach(topic => {
            this.client.subscribe(topic);
        });
    };

    onChange: OnChangeInputText = prop => e => {
        const newState = {};
        newState[prop] = e.target.value;
        this.setState(newState);
    };

    private brokerForm = () => {
        return (
            <BrokerForm
                hostname={this.state.hostname}
                running={this.state.running}
                port={this.state.port}
                brokerPath={this.state.brokerPath}
                onChange={this.onChange}
            />
        );
    };

    private onCredentialsSwitch = v => {
        this.setState({
            credentials: v,
            username: "",
            password: ""
        });
    };

    private onChangeSwitch = (prop: string) => (v: boolean) => {
        const nextState = {};
        nextState[prop] = v;
        this.setState(nextState);
    };

    private credentialsSwitch = () => {
        return (
            <Switch
                disabled={this.state.running}
                style={{ margin: 10, marginBottom: 20, marginLeft: 0 }}
                onChange={this.onCredentialsSwitch}
                checked={this.state.credentials}
            />
        );
    };

    private onChangeSettingsMaxMessages = e => {
        const valueAsString = e.target.value;
        const valueAsNumber = Number(valueAsString);
        this.setState({
            settings_max_messages: valueAsString,
            messages: this.state.messages.slice(0, valueAsNumber)
        });
    };

    private close_modal_topics = () => {
        this.setState({ modal_topics: false });
    };

    private open_modal_topics = () => {
        this.setState({ modal_topics: true });
    };

    private close_modal_settings = () => {
        this.setState({ modal_settings: false });
    };

    private open_modal_settings = () => {
        this.setState({ modal_settings: true });
    };

    private close_modal_createConnection = () => {
        this.setState({ modal_create_connection: false });
    };

    private open_modal_createConnection = () => {
        this.setState({ modal_create_connection: true });
    };

    private modal_createConnection = () => {
        return (
            <>
                <h2> Connection configuration </h2>
                {this.brokerForm()}
                <h3> Use Credentials </h3>
                {this.credentialsSwitch()}
                {this.state.credentials ? this.credentialsForm() : <div></div>}
                {this.buttonsBar()}
            </>
        );
    };

    private onAddTopic = () => {
        this.addTopic(this.state.draft_topic);
        this.setState({ draft_topic: "" });
    };

    private modal_topics = () => {
        return (
            <TopicsModal
                submitFn={this.onAddTopic}
                draft_topic={this.state.draft_topic}
                addTopic={this.addTopic}
                removeTopic={this.removeTopic}
                onChange={this.onChange}
                closeTopicsModal={this.close_modal_topics}
                topics={this.state.topics}
                modal_topics={this.state.modal_topics}
            />
        );
    };

    private credentialsForm = () => {
        return (
            <CredentialsForm
                running={this.state.running}
                onChange={this.onChange}
                password={this.state.password}
                username={this.state.username}
            />
        );
    };

    private buttonsBar = () => {
        return (
            <ButtonsBar
                save={this.saveConnection}
                open_modal_topics={this.open_modal_topics}
                open_modal_settings={this.open_modal_settings}
                running={this.state.running}
                start={this.start}
                stop={this.stop}
                modal_topics={this.state.modal_topics}
            />
        );
    };

    private addMessage = (message: OutputMessage_t) => {
        const messages: OutputMessage_t[] = [...this.state.messages].slice(0, this.state.settings_max_messages - 1);
        messages.unshift(message);
        this.setState({ messages });
    };

    private addTopic = (pattern: string) => {
        if (!pattern) return;
        const topics = { ...this.state.topics };
        topics[pattern] = { pattern };
        this.setState({ topics }, this.saveConnection);
        if (this.client) {
            this.client.subscribe(pattern);
        }
    };

    private removeTopic = (pattern: string) => {
        const topics = { ...this.state.topics };
        delete topics[pattern];
        this.setState({ topics });
        if (this.client) {
            this.client.unsubscribe(pattern);
        }
    };

    private getSimilarConnections = (conn: Connection_t) => {
        return (
            conn.brokerPath === this.state.brokerPath &&
            conn.protocol === this.state.protocol &&
            conn.username === this.state.username &&
            conn.port === this.state.port
        );
    };

    private selectConnection: SelectConnectionMethod = (connection, cb) => () => {
        const conns = this.state.connections.filter((conn: Connection_t) => {
            return connection.uuid === conn.uuid;
        });
        if (conns.length !== 0) {
            const connection: Connection_t = conns[0];
            this.setState(
                {
                    hostname: connection.hostname,
                    port: connection.port,
                    username: connection.username,
                    credentials: !!connection.username,
                    brokerPath: connection.brokerPath,
                    protocol: connection.protocol,
                    topics: connection.topics
                },
                cb
            );
        }
    };

    private deleteConnection: DeleteConnectionMethod = connection => () => {
        const connections = [...this.state.connections].filter((conn: Connection_t) => {
            return connection.uuid !== conn.uuid;
        });
        this.setState({ connections });
        ls.set(LSKEY_CONNECTIONS, connections);
    };

    render = () => {
        return (
            <div style={outer_frame}>
                {this.modal_settings()}
                {this.modal_topics()}
                <Modal
                    onOk={this.close_modal_createConnection}
                    onCancel={this.close_modal_createConnection}
                    visible={this.state.modal_create_connection}
                >
                    {this.modal_createConnection()}
                </Modal>
                <Row gutter={50}>
                    <Col span={10}>
                        <RecentConnections
                            running={this.state.running}
                            start={this.start}
                            stop={this.stop}
                            open_modal_createConnection={this.open_modal_createConnection}
                            close_modal_createConnection={this.close_modal_createConnection}
                            open_modal_settings={this.open_modal_settings}
                            connections={this.state.connections}
                            deleteConnection={this.deleteConnection}
                            selectConnection={this.selectConnection}
                        />
                    </Col>
                    <Col span={14}>
                        <OutputDisplay running={this.state.running} messages={this.state.messages} />
                    </Col>
                </Row>
            </div>
        );
    };
}
