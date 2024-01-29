/*
 * Copyright 2016 balena.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import CircleSvg from '@fortawesome/fontawesome-free/svgs/solid/circle.svg';
import * as _ from 'lodash';
import * as path from 'path';
import * as React from 'react';
import { Flex, Modal as SmallModal, Txt } from 'rendition';

import * as constraints from '../../../../shared/drive-constraints';
import * as messages from '../../../../shared/messages';
import { ProgressButton } from '../../components/progress-button/progress-button';
import * as availableDrives from '../../models/available-drives';
import * as flashState from '../../models/flash-state';
import * as selection from '../../models/selection-state';
import * as analytics from '../../modules/analytics';
import * as imageWriter from '../../modules/image-writer';
import * as notification from '../../os/notification';
import {
	selectAllTargets,
	TargetSelectorModal,
} from '../../components/target-selector/target-selector';

import FlashSvg from '../../../assets/flash.svg';
import DriveStatusWarningModal from '../../components/drive-status-warning-modal/drive-status-warning-modal';
import * as i18next from 'i18next';

const COMPLETED_PERCENTAGE = 100;
const SPEED_PRECISION = 2;

const getErrorMessageFromCode = (errorCode: string) => {
	// TODO: All these error codes to messages translations
	// should go away if the writer emitted user friendly
	// messages on the first place.
	if (errorCode === 'EVALIDATION') {
		return messages.error.validation();
	} else if (errorCode === 'EUNPLUGGED') {
		return messages.error.driveUnplugged();
	} else if (errorCode === 'EIO') {
		return messages.error.inputOutput();
	} else if (errorCode === 'ENOSPC') {
		return messages.error.notEnoughSpaceInDrive();
	} else if (errorCode === 'ECHILDDIED') {
		return messages.error.childWriterDied();
	}
	return '';
};

function notifySuccess(
	iconPath: string,
	basename: string,
	drives: any,
	devices: { successful: number; failed: number },
) {
	notification.send(
		'Flash complete!',
		messages.info.flashComplete(basename, drives, devices),
		iconPath,
	);
}

function notifyFailure(iconPath: string, basename: string, drives: any) {
	notification.send(
		'Oops! Looks like the flash failed.',
		messages.error.flashFailure(basename, drives),
		iconPath,
	);
}

async function flashImageToDrive(
	isFlashing: boolean,
	goToSuccess: () => void,
): Promise<string> {
	const devices = selection.getSelectedDevices();
	const image: any = selection.getImage();
	const drives = availableDrives.getDrives().filter((drive: any) => {
		return devices.includes(drive.device);
	});

	if (drives.length === 0 || isFlashing) {
		return '';
	}

	const iconPath = 'data:image/png;base64,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';
	const basename = path.basename(image.path);
	try {
		await imageWriter.flash(image, drives);
		if (!flashState.wasLastFlashCancelled()) {
			const {
				results = { devices: { successful: 0, failed: 0 } },
				skip,
				cancelled,
			} = flashState.getFlashResults();
			if (!skip && !cancelled) {
				if (results?.devices?.successful > 0) {
					notifySuccess(iconPath, basename, drives, results.devices);
				} else {
					notifyFailure(iconPath, basename, drives);
				}
			}
			goToSuccess();
		}
	} catch (error: any) {
		notifyFailure(iconPath, basename, drives);
		let errorMessage = getErrorMessageFromCode(error.code);
		if (!errorMessage) {
			error.image = basename;
			analytics.logException(error);
			errorMessage = messages.error.genericFlashError(error);
		}
		return errorMessage;
	} finally {
		availableDrives.setDrives([]);
	}

	return '';
}

const formatSeconds = (totalSeconds: number) => {
	if (typeof totalSeconds !== 'number' || !Number.isFinite(totalSeconds)) {
		return '';
	}
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = Math.floor(totalSeconds - minutes * 60);

	return `${minutes}m${seconds}s`;
};

interface FlashStepProps {
	shouldFlashStepBeDisabled: boolean;
	goToSuccess: () => void;
	isFlashing: boolean;
	style?: React.CSSProperties;
	// TODO: factorize
	step: 'decompressing' | 'flashing' | 'verifying';
	percentage: number;
	position: number;
	failed: number;
	speed?: number;
	eta?: number;
	width: string;
}

export interface DriveWithWarnings extends constraints.DrivelistDrive {
	statuses: constraints.DriveStatus[];
}

interface FlashStepState {
	warningMessage: boolean;
	errorMessage: string;
	showDriveSelectorModal: boolean;
	systemDrives: boolean;
	drivesWithWarnings: DriveWithWarnings[];
}

export class FlashStep extends React.PureComponent<
	FlashStepProps,
	FlashStepState
> {
	constructor(props: FlashStepProps) {
		super(props);
		this.state = {
			warningMessage: false,
			errorMessage: '',
			showDriveSelectorModal: false,
			systemDrives: false,
			drivesWithWarnings: [],
		};
	}

	private async handleWarningResponse(shouldContinue: boolean) {
		this.setState({ warningMessage: false });
		if (!shouldContinue) {
			this.setState({ showDriveSelectorModal: true });
			return;
		}
		this.setState({
			errorMessage: await flashImageToDrive(
				this.props.isFlashing,
				this.props.goToSuccess,
			),
		});
	}

	private handleFlashErrorResponse(shouldRetry: boolean) {
		this.setState({ errorMessage: '' });
		flashState.resetState();
		if (shouldRetry) {
			analytics.logEvent('Restart after failure');
		} else {
			selection.clear();
		}
	}

	private hasListWarnings(drives: any[]) {
		if (drives.length === 0 || flashState.isFlashing()) {
			return;
		}
		return drives.filter((drive) => drive.isSystem).length > 0;
	}

	private async tryFlash() {
		const drives = selection.getSelectedDrives().map((drive) => {
			return {
				...drive,
				statuses: constraints.getDriveImageCompatibilityStatuses(
					drive,
					undefined,
					true,
				),
			};
		});
		if (drives.length === 0 || this.props.isFlashing) {
			return;
		}
		const hasDangerStatus = drives.some((drive) => drive.statuses.length > 0);
		if (hasDangerStatus) {
			const systemDrives = drives.some((drive) =>
				drive.statuses.includes(constraints.statuses.system),
			);
			this.setState({
				systemDrives,
				drivesWithWarnings: drives.filter((driveWithWarnings) => {
					return (
						driveWithWarnings.isSystem ||
						(!systemDrives &&
							driveWithWarnings.statuses.includes(constraints.statuses.large))
					);
				}),
				warningMessage: true,
			});
			return;
		}
		this.setState({
			errorMessage: await flashImageToDrive(
				this.props.isFlashing,
				this.props.goToSuccess,
			),
		});
	}

	public render() {
		return (
			<>
				<Flex
					flexDirection="column"
					alignItems="start"
					width={this.props.width}
					style={this.props.style}
				>
					<FlashSvg
						width="40px"
						className={this.props.shouldFlashStepBeDisabled ? 'disabled' : ''}
						style={{
							margin: '0 auto',
						}}
					/>

					<ProgressButton
						type={this.props.step}
						active={this.props.isFlashing}
						percentage={this.props.percentage}
						position={this.props.position}
						disabled={this.props.shouldFlashStepBeDisabled}
						cancel={imageWriter.cancel}
						warning={this.hasListWarnings(selection.getSelectedDrives())}
						callback={() => this.tryFlash()}
					/>

					{!_.isNil(this.props.speed) &&
						this.props.percentage !== COMPLETED_PERCENTAGE && (
							<Flex
								justifyContent="space-between"
								fontSize="14px"
								color="#7e8085"
								width="100%"
							>
								<Txt>
									{i18next.t('flash.speedShort', {
										speed: this.props.speed.toFixed(SPEED_PRECISION),
									})}
								</Txt>
								{!_.isNil(this.props.eta) && (
									<Txt>
										{i18next.t('flash.eta', {
											eta: formatSeconds(this.props.eta),
										})}
									</Txt>
								)}
							</Flex>
						)}

					{Boolean(this.props.failed) && (
						<Flex color="#fff" alignItems="center" mt={35}>
							<CircleSvg height="1em" fill="#ff4444" />
							<Txt ml={10}>{this.props.failed}</Txt>
							<Txt ml={10}>{messages.progress.failed(this.props.failed)}</Txt>
						</Flex>
					)}
				</Flex>

				{this.state.warningMessage && (
					<DriveStatusWarningModal
						done={() => this.handleWarningResponse(true)}
						cancel={() => this.handleWarningResponse(false)}
						isSystem={this.state.systemDrives}
						drivesWithWarnings={this.state.drivesWithWarnings}
					/>
				)}

				{this.state.errorMessage && (
					<SmallModal
						width={400}
						titleElement={'Attention'}
						cancel={() => this.handleFlashErrorResponse(false)}
						done={() => this.handleFlashErrorResponse(true)}
						action={'Retry'}
					>
						<Txt>
							{this.state.errorMessage.split('\n').map((message, key) => (
								<p key={key}>{message}</p>
							))}
						</Txt>
					</SmallModal>
				)}
				{this.state.showDriveSelectorModal && (
					<TargetSelectorModal
						write={true}
						cancel={() => this.setState({ showDriveSelectorModal: false })}
						done={(modalTargets) => {
							selectAllTargets(modalTargets);
							this.setState({ showDriveSelectorModal: false });
						}}
					/>
				)}
			</>
		);
	}
}
