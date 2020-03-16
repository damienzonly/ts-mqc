import React from "react";
import { buttonStyle } from "../style/app.style";
import { Button, Spin } from "antd";
import "antd/dist/antd.css";

export interface ButtonsBarProps {
    running: boolean;
    save: () => void;
    start: () => void;
    stop: () => void;
    open_modal_topics: () => void;
    open_modal_settings: () => void;
    modal_topics: boolean;
}

export class ButtonsBar extends React.Component<ButtonsBarProps> {
    render() {
        return (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                    <Button style={buttonStyle} onClick={this.props.save} type={"primary"}>
                        Save
                    </Button>
                    {this.props.running ? <Spin style={{ marginLeft: 10 }} /> : null}
                </div>
                <div>
                    <Button
                        style={{ ...buttonStyle, marginRight: 0 }}
                        onClick={this.props.open_modal_topics}
                        disabled={this.props.modal_topics}
                        type={"primary"}
                    >
                        Add Topics
                    </Button>
                </div>
            </div>
        );
    }
}
