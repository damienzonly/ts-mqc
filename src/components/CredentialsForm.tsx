import React from "react";
import { Input } from "antd";
import { inputStyle } from "../style/app.style";
import { OnChangeInputText } from "../types/App";

export interface CredentialsFormProps {
    running: boolean;
    username: string;
    password: string;
    onChange: OnChangeInputText;
    [x: string]: any;
}

export class CredentialsForm extends React.Component<CredentialsFormProps> {
    render() {
        return (
            <>
                <h3>Username</h3>
                <Input
                    style={inputStyle}
                    disabled={this.props.running}
                    onChange={this.props.onChange("username")}
                    value={this.props.username}
                    placeholder="Username"
                />
                <h3>Password</h3>
                <Input
                    type="password"
                    style={inputStyle}
                    disabled={this.props.running}
                    onChange={this.props.onChange("password")}
                    value={this.props.password}
                    placeholder="Password"
                />
            </>
        );
    }
}
