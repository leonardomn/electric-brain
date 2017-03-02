-- EBSequenceLengthCriterion is a filler node used for the sequence-length tensor within the neural network
local EBSequenceLengthCriterion, parent = torch.class('nn.EBSequenceLengthCriterion', 'nn.Criterion')

function EBSequenceLengthCriterion:__init()
    parent.__init(self)
end

function EBSequenceLengthCriterion:updateOutput(input, target)
    return 0
end

function EBSequenceLengthCriterion:updateGradInput(input, target)
    self.gradInput = input
    return self.gradInput
end
