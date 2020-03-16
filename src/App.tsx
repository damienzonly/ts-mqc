import React from "react";
import mqtt, { MqttClient, IClientOptions, OnMessageCallback } from "mqtt";
import { message, Switch, Row, Col } from "antd";
import validator from "validator";
import "antd/dist/antd.css";
import { outer_frame } from "./style/app.style";
import { LocalStorage } from "./lib/LocalStorage";
import { LSKEY_CONNECTIONS, MQC_MAX_MESSAGES_LENGTH } from "./lib/constants";
import {
    IMqcState,
    Connection_t,
    Test_t,
    OutputMessage_t,
    OnChangeInputText,
    DeleteConnectionMethod,
    SelectConnectionMethod
} from "./types/App";
import "font-awesome/css/font-awesome.min.css";
import { CredentialsForm } from "./components/CredentialsForm";
import { v4 as uuid } from "uuid";
import { BrokerForm } from "./components/BrokerForm";
import { ButtonsBar } from "./components/ButtonsBar";
import { RecentConnections } from "./components/RecentConnections";
import { TopicsModal } from "./components/TopicsModal";
import { OutputDisplay } from "./components/OuputDisplay";
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
        topicsModal: false,
        topics: {},
        messages: [],
        running: false,
        credentials: false
    };

    private client: MqttClient;

    private clearConnections = () => {
        ls.set(LSKEY_CONNECTIONS, []);
        this.setState({ connections: [] });
    };

    /**
     * This method will save the following state properties
     * in the connections key of localstorage:
     * **hostname**, **brokerPath**, **port**, **protocol**, **topics**, **username**
     */
    private saveConf = () => {
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
            this.saveConf();
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
    private settingsModal = () => {};

    componentDidMount = () => {
        this.stop();
        const connections = ls.get(LSKEY_CONNECTIONS);
        if (connections !== null && Array.isArray(connections) && connections.length) {
            this.setState({ connections });
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
    private handleJSONMessage: OnMessageCallback = (topic, message) => {
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
            .on("message", (topic, message) => {
                // todo: add json flag configuration to avoid parsing when unnecessary
                // if (this.state.jsonparseflag) {
                //     setImmediate(() => this.handleJSONMessage(topic, message));
                // } else {
                //     setImmediate(() => this.handlePlainMessage(topic, message));
                // }
                const msg = message.toString();
                let payload;
                try {
                    const parsed = JSON.parse(msg);
                    payload = JSON.stringify(parsed, null, 4);
                } catch (e) {
                    payload = msg;
                }
                this.addMessage({ topic, payload, ts: Date.now() });
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

    private closeTopicsModal = () => {
        this.setState({ topicsModal: false });
    };

    private openTopicsModal = () => {
        this.setState({ topicsModal: true });
    };

    private topicsModal = () => {
        return (
            <TopicsModal
                draft_topic={this.state.draft_topic}
                addTopic={this.addTopic}
                removeTopic={this.removeTopic}
                onChange={this.onChange}
                closeTopicsModal={this.closeTopicsModal}
                topics={this.state.topics}
                topicsModal={this.state.topicsModal}
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
                openTopicsModal={this.openTopicsModal}
                running={this.state.running}
                start={this.start}
                stop={this.stop}
                topicsModal={this.state.topicsModal}
            />
        );
    };

    private addMessage = (message: OutputMessage_t) => {
        const messages: OutputMessage_t[] = [...this.state.messages];
        messages.unshift(message);
        if (messages.length === MQC_MAX_MESSAGES_LENGTH + 1) {
            messages.pop();
        }
        this.setState({ messages });
    };

    private addTopic = (pattern: string) => {
        if (!pattern) return;
        const topics = { ...this.state.topics };
        topics[pattern] = { pattern };
        this.setState({ topics });
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

    private selectConnection: SelectConnectionMethod = connection => () => {
        const conns = this.state.connections.filter((conn: Connection_t) => {
            return connection.uuid === conn.uuid;
        });
        if (conns.length !== 0) {
            const connection: Connection_t = conns[0];
            this.setState({
                hostname: connection.hostname,
                port: connection.port,
                username: connection.username,
                credentials: !!connection.username,
                brokerPath: connection.brokerPath,
                protocol: connection.protocol,
                topics: connection.topics
            });
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
                {this.topicsModal()}
                <Row gutter={100}>
                    <Col flex={2}>
                        <RecentConnections
                            clearConnections={this.clearConnections}
                            connections={this.state.connections}
                            deleteConnection={this.deleteConnection}
                            selectConnection={this.selectConnection}
                        />
                    </Col>
                    <Col flex={5}>
                        <h2> Connection configuration </h2>
                        {this.brokerForm()}
                        <h3> Use Credentials </h3>
                        {this.credentialsSwitch()}
                        {this.state.credentials ? this.credentialsForm() : <div></div>}
                        {this.buttonsBar()}
                    </Col>
                    <Col flex={5}></Col>
                </Row>
                <Row>
                    <OutputDisplay messages={this.state.messages} />
                </Row>
            </div>
        );
    };
}
