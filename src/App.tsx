import React from "react";
import mqtt, { MqttClient, IClientOptions } from "mqtt";
import { message, Input, Spin, Switch, Modal, List, Row, Alert, Col, Button, Tag, Table } from "antd";
import validator from "validator";
import "antd/dist/antd.css";
import { outer_frame, inputStyle, buttonStyle } from "./style/app.style";
import { LocalStorage } from "./lib/LocalStorage";
import { LSKEY_CONNECTIONS, MQC_MAX_MESSAGES_LENGTH } from "./lib/constants";
import { IMqcState, Connection_t, Test_t, OutputMessage_t, OnChangeInputText } from "./types/App";
import "font-awesome/css/font-awesome.min.css";
import { CredentialsForm } from "./components/CredentialsForm";
import { v4 as uuid } from "uuid";
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
     *
     */
    private saveConf = () => {
        const hostname = this.state.hostname;
        const brokerPath = this.state.brokerPath;
        const port = this.state.port;
        const protocol = this.state.protocol;
        const topics = this.state.topics;
        const username = this.state.username;
        if (!hostname || !port || !protocol) return;
        const connection: Connection_t = { uuid: uuid(), hostname, brokerPath, port, protocol, topics, username };
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

        tests.forEach((test: Test_t) => {
            if (!test.cond) {
                throw test.message;
            }
        });
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
            <>
                <h3>Hostname</h3>
                <Input
                    style={inputStyle}
                    disabled={this.state.running}
                    onChange={this.onChange("hostname")}
                    value={this.state.hostname}
                    placeholder="Hostname (e.g. broker.emqx.io)"
                    // todo: add filtering by host
                />
                <h3>Port</h3>
                <Input
                    style={inputStyle}
                    type="number"
                    disabled={this.state.running}
                    onChange={this.onChange("port")}
                    value={this.state.port}
                    placeholder="Port (e.g. 1883)"
                    // todo: add filtering by port
                />
                <h3>Path</h3>
                <Input
                    style={inputStyle}
                    disabled={this.state.running}
                    onChange={this.onChange("brokerPath")}
                    value={this.state.brokerPath}
                    placeholder="Path (e.g. /mqtt) leave it empty if unnecessary"
                    // todo: add filtering by port
                />
            </>
        );
    };

    private credentialsSwitch = () => {
        return (
            <Switch
                disabled={this.state.running}
                style={{ margin: 10, marginBottom: 20, marginLeft: 0 }}
                onChange={v => {
                    this.setState({
                        credentials: v,
                        username: "",
                        password: ""
                    });
                }}
                checked={this.state.credentials}
            />
        );
    };

    private removeTopicButton = (topic: string) => {
        return (
            <Button
                type={"danger"}
                onClick={() => {
                    this.removeTopic(topic);
                }}
            >
                <i className="fa fa-plus" />
                &nbsp; Delete
            </Button>
        );
    };

    private closeTopicsModal = () => {
        this.setState({ topicsModal: false });
    };

    private openTopicsModal = () => {
        this.setState({ topicsModal: true });
    };

    private topicsModal = () => {
        const topics = Object.keys(this.state.topics);
        const submitFn = () => {
            this.addTopic(this.state.draft_topic);
            this.setState({ draft_topic: "" });
        };
        return (
            <>
                <Modal
                    title="Topics"
                    visible={this.state.topicsModal}
                    onCancel={this.closeTopicsModal}
                    onOk={this.closeTopicsModal}
                >
                    <h3> Add Topics </h3>
                    <Input
                        value={this.state.draft_topic}
                        onChange={this.onChange("draft_topic")}
                        onPressEnter={submitFn}
                        placeholder={"Type a topic and press enter"}
                    ></Input>
                    <List
                        style={{ width: "100%" }}
                        dataSource={topics}
                        renderItem={(topic: string) => {
                            return (
                                <List.Item
                                    key={topic}
                                    style={{
                                        display: "flex",
                                        wordBreak: "break-word",
                                        justifyContent: "space-between"
                                    }}
                                >
                                    {<Tag color={"purple"}>{topic}</Tag>}
                                    {this.removeTopicButton(topic)}
                                </List.Item>
                            );
                        }}
                    ></List>
                </Modal>
            </>
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

    private lowerButtons = () => {
        return (
            <>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                        <Button style={buttonStyle} onClick={this.start} disabled={this.state.running} type={"primary"}>
                            Start
                        </Button>
                        <Button style={buttonStyle} onClick={this.stop} disabled={!this.state.running} type={"danger"}>
                            Stop
                        </Button>
                        {this.state.running ? <Spin style={{ marginLeft: 10 }} /> : null}
                    </div>
                    <div>
                        <Button
                            style={{ ...buttonStyle, marginRight: 0 }}
                            onClick={this.openTopicsModal}
                            disabled={this.state.topicsModal}
                            type={"primary"}
                        >
                            Add Topics
                        </Button>
                    </div>
                </div>
            </>
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

    private fallbackNone = (string: string) => {
        if (string) return string;
        else return <Tag color={"blue"}>{"<none>"}</Tag>;
    };

    private getSimilarConnections = (conn: Connection_t) => {
        return (
            conn.brokerPath === this.state.brokerPath &&
            conn.protocol === this.state.protocol &&
            conn.username === this.state.username &&
            conn.port === this.state.port
        );
    };

    private selectConnection = (connection: Connection_t) => () => {
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

    private deleteConnection = (connection: Connection_t) => () => {
        debugger;
        const connections = [...this.state.connections].filter((conn: Connection_t) => {
            return connection.uuid !== conn.uuid;
        });
        this.setState({ connections });
        ls.set(LSKEY_CONNECTIONS, connections);
    };

    render = () => {
        const recentConnectionsColumns = [
            { title: "Hostname", dataIndex: "hostname", render: this.fallbackNone },
            { title: "Port", dataIndex: "port", render: this.fallbackNone },
            { title: "Username", dataIndex: "username", render: this.fallbackNone },
            { title: "Path", dataIndex: "brokerPath", render: this.fallbackNone },
            {
                title: "",
                render: (record: Connection_t) => {
                    return (
                        <>
                            <Button style={buttonStyle} onClick={this.selectConnection(record)} type={"primary"}>
                                Select
                            </Button>
                            <Button style={buttonStyle} onClick={this.deleteConnection(record)} type={"danger"}>
                                Delete
                            </Button>
                        </>
                    );
                }
            }
        ];
        return (
            <div style={outer_frame}>
                {this.topicsModal()}
                <Row gutter={100}>
                    <Col flex={2}>
                        <h2> Recent Connections </h2>
                        <Button style={{ marginBottom: 10 }} type={"primary"} onClick={this.clearConnections}>
                            Clear
                        </Button>
                        <Table
                            style={{ minWidth: "30%" }}
                            rowKey={"uuid"}
                            size={"small"}
                            columns={recentConnectionsColumns}
                            dataSource={this.state.connections}
                        ></Table>
                    </Col>
                    <Col flex={5}>
                        <h2> Connection configuration </h2>
                        {this.brokerForm()}
                        <h3> Use Credentials </h3>
                        {this.credentialsSwitch()}
                        {this.state.credentials ? this.credentialsForm() : <div></div>}
                        {this.lowerButtons()}
                    </Col>
                    <Col flex={5}></Col>
                </Row>
                <Row>
                    <List
                        style={{
                            width: "100%"
                        }}
                        dataSource={this.state.messages}
                        renderItem={(message: OutputMessage_t, i) => {
                            return (
                                <List.Item
                                    key={message.payload + i}
                                    style={{
                                        whiteSpace: "pre-wrap",
                                        display: "flex",
                                        justifyContent: "space-between"
                                    }}
                                >
                                    <Alert type={"info"} message={new Date(message.ts).toISOString()} />
                                    <Alert type={"success"} message={message.topic} />
                                    <Alert type={"error"} message={message.payload} />
                                </List.Item>
                            );
                        }}
                    ></List>
                </Row>
            </div>
        );
    };
}
