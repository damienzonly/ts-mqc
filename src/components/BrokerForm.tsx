import React from "react";
import { inputStyle } from "../style/app.style";
import { OnChangeInputText } from "../types/App";
import { Input } from "antd";
import "antd/dist/antd.css";

export interface BrokerFormProps {
    running: boolean;
    hostname: string;
    port: string;
    brokerPath: string;
    onChange: OnChangeInputText;
}

export class BrokerForm extends React.Component<BrokerFormProps> {
    render() {
        return (
            <>
                <h3>Hostname</h3>
                <Input
                    style={inputStyle}
                    disabled={this.props.running}
                    onChange={this.props.onChange("hostname")}
                    value={this.props.hostname}
                    placeholder="Hostname (e.g. broker.emqx.io)"
                    // todo: add filtering by host
                />
                <h3>Port</h3>
                <Input
                    style={inputStyle}
                    type="number"
                    disabled={this.props.running}
                    onChange={this.props.onChange("port")}
                    value={this.props.port}
                    placeholder="Port (e.g. 1883)"
                    // todo: add filtering by port
                />
                <h3>Path</h3>
                <Input
                    style={inputStyle}
                    disabled={this.props.running}
                    onChange={this.props.onChange("brokerPath")}
                    value={this.props.brokerPath}
                    placeholder="Path (e.g. /mqtt) leave it empty if unnecessary"
                    // todo: add filtering by port
                />
            </>
        );
    }
}
