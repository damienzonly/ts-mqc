import React from "react";
import { inputStyle } from "../style/app.style";
import { Input } from "antd";
import "antd/dist/antd.css";
import { OnChangeInputTextFunction } from "../types/App";

export interface BrokerFormProps {
    running: boolean;
    hostname: string;
    port: string;
    brokerPath: string;
    connection_name: string;
    onChange_connection_name: OnChangeInputTextFunction;
    onChange_connection_hostname: OnChangeInputTextFunction;
    onChange_connection_port: OnChangeInputTextFunction;
    onChange_connection_brokerPath: OnChangeInputTextFunction;
}

export class BrokerForm extends React.Component<BrokerFormProps> {
    render() {
        return (
            <>
                <h3> Connection Name </h3>
                <Input
                    style={inputStyle}
                    disabled={this.props.running}
                    onChange={this.props.onChange_connection_name}
                    value={this.props.connection_name}
                    placeholder="Connection Name"
                />
                <h3>Hostname</h3>
                <Input
                    style={inputStyle}
                    disabled={this.props.running}
                    onChange={this.props.onChange_connection_hostname}
                    value={this.props.hostname}
                    placeholder="Hostname (e.g. broker.emqx.io)"
                    // todo: add filtering by host
                />
                <h3>Port</h3>
                <Input
                    style={inputStyle}
                    type="number"
                    disabled={this.props.running}
                    onChange={this.props.onChange_connection_port}
                    value={this.props.port}
                    placeholder="Port (e.g. 1883)"
                    // todo: add filtering by port
                />
                <h3>Path</h3>
                <Input
                    style={inputStyle}
                    disabled={this.props.running}
                    onChange={this.props.onChange_connection_brokerPath}
                    value={this.props.brokerPath}
                    placeholder="Path (e.g. /mqtt) leave it empty if unnecessary"
                    // todo: add filtering by port
                />
            </>
        );
    }
}
