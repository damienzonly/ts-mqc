import React from "react";
import mqtt, { MqttClient, IClientOptions } from "mqtt";
import { message, Input, Spin, Switch, List, Row, Alert, Col, Button } from "antd";
import validator from "validator";
import "antd/dist/antd.css";
import { outer_frame, inputStyle } from "./style/app.style";
import { LocalStorage } from "./lib/LocalStorage";
import { LSKEY_CONNECTIONS, LSKEY_LOCAL_CONF, MQC_MAX_MESSAGES_LENGTH } from "./lib/constants";
import { IMqcState, Connection_t, Test_t, OutputMessage_t } from "./types/types";
import "font-awesome/css/font-awesome.min.css";

const ls = new LocalStorage();

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
        topics: {},
        messages: [],
        running: false,
        credentials: false
    };

    private client: MqttClient;
    private saveInterval: NodeJS.Timeout;

    private saveConf = () => {
        ls.set(LSKEY_LOCAL_CONF, this.state);
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

    private startAutoSave = () => {
        this.saveInterval = setInterval(this.saveConf, 1000);
    };

    private stopAutoSave = () => {
        if (this.saveInterval !== undefined) {
            clearInterval(this.saveInterval);
        }
    };

    componentDidMount = () => {
        this.startAutoSave();
        this.stop();
        const connections = ls.get(LSKEY_CONNECTIONS);
        if (connections !== null && Array.isArray(connections) && connections.length) {
            this.setState({ connections });
        }

        const localConf = ls.get(LSKEY_LOCAL_CONF);
        if (localConf !== null) {
            this.setState(localConf);
        }
        // if conf saved in ls was running: true it must reset
        this.unsetRunning();
    };

    componentWillUnmount = () => {
        this.stopAutoSave();
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
                const msg = message.toString();
                let payload;
                try {
                    const parsed = JSON.parse(msg);
                    payload = JSON.stringify(parsed, null, 2);
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

    private credentialsForm = () => {
        return (
            <>
                <h3>Username</h3>
                <Input
                    style={inputStyle}
                    disabled={this.state.running}
                    onChange={this.onChange("username")}
                    value={this.state.username}
                    placeholder="Username"
                />
                <h3>Password</h3>
                <Input
                    style={inputStyle}
                    disabled={this.state.running}
                    onChange={this.onChange("password")}
                    value={this.state.password}
                    placeholder="Password"
                />
            </>
        );
    };

    onChange = (prop: string) => e => {
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
                onChange={v => this.setState({ credentials: v })}
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

    private topicsForm = () => {
        const topics = Object.keys(this.state.topics);
        const submitFn = () => {
            this.addTopic(this.state.draft_topic);
            this.setState({ draft_topic: "" });
        };
        return (
            <>
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
                                style={{ display: "flex", wordBreak: "break-word", justifyContent: "space-between" }}
                            >
                                {topic}
                                {this.removeTopicButton(topic)}
                            </List.Item>
                        );
                    }}
                ></List>
            </>
        );
    };

    private lowerButtons = () => {
        return (
            <>
                <Button
                    style={{ margin: 10, marginLeft: 0 }}
                    onClick={this.start}
                    disabled={this.state.running}
                    type={"primary"}
                >
                    Start
                </Button>
                <Button
                    style={{ margin: 10, marginLeft: 0 }}
                    onClick={this.stop}
                    disabled={!this.state.running}
                    type={"danger"}
                >
                    Stop
                </Button>
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

    render = () => {
        return (
            <div style={outer_frame}>
                <Row gutter={30}>
                    <Col span={8}>
                        <h2> Recent Connections </h2>
                        {this.state.connections.map((connection: Connection_t) => {
                            // todo: implement
                            return null;
                        })}
                    </Col>
                    <Col span={8}>
                        <h2> MQTT Client </h2>
                        {this.brokerForm()}
                        <h3> Use Credentials </h3>
                        {this.credentialsSwitch()}
                        {this.state.credentials ? this.credentialsForm() : <div></div>}
                        {this.lowerButtons()}
                        {this.state.running ? <Spin style={{ margin: 10 }} /> : null}
                    </Col>
                    <Col span={8}>{this.topicsForm()}</Col>
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
