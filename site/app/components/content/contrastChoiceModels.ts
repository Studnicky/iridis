interface ContrastChoiceItemInterface {
  readonly 'description': string;
  readonly 'label': string;
  readonly 'value': string;
}

interface ContrastChoiceModelInterface {
  readonly 'body': string;
  readonly 'items': readonly ContrastChoiceItemInterface[];
  readonly 'legend': string;
}

/** Labels and help text for the CVD mode and non-mandatory level selectors. */
export class ContrastChoiceModels {
  public static readonly cvdMode: ContrastChoiceModelInterface = {
    'body': 'How the engine treats colour-vision-deficiency evidence on the resolved roles.',
    'items': [
      { 'description': 'Observes evidence only; roles and admission are unchanged.', 'label': 'Warn', 'value': 'warn' },
      { 'description': 'Corrects unpinned roles; unresolved evidence stays advisory.', 'label': 'Nudge', 'value': 'nudge' },
      { 'description': 'Corrects unpinned roles and blocks unresolved evidence.', 'label': 'Enforce', 'value': 'enforce' }
    ],
    'legend': 'CVD mode'
  };

  public static readonly nonMandatoryLevel: ContrastChoiceModelInterface = {
    'body': 'The standard applied to pairs the schema does not mandate, such as 3:1 non-text pairs.',
    'items': [
      { 'description': 'Keeps the declared minimum, 3:1 for non-text pairs.', 'label': 'AA', 'value': 'AA' },
      { 'description': 'Lifts non-text pairs from 3:1 to 4.5:1.', 'label': 'AAA', 'value': 'AAA' }
    ],
    'legend': 'Non-mandatory level'
  };
}
