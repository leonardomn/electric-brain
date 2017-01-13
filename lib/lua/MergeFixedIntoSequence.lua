require('torch')
require('nn')

local MergeFixedIntoSequence, parent = torch.class('nn.MergeFixedIntoSequence', 'nn.Module')

function MergeFixedIntoSequence:__init(name)
    parent.__init(self)
    self.name = name
end

function MergeFixedIntoSequence:updateOutput(input)
    -- Make sure that the first entry is a tensor, second is a table
    assert(torch.type(input[1]) == 'tensor')
    assert(torch.type(input[2]) == 'table')

    local fixedSize = input[1]:size()[3]
    local sequenceSize = input[2][1]:size()[3]
    local batchSize = input[1]:size()[2]

    -- Prepare a new output sequence
    local mergedSequence = {}
    for n=1,#(input[2]) do
        -- Create a new tensor
        local newTensor = torch.Tensor(1, batchSize, fixedSize + sequenceSize)
        if fixedSize > 0 then
            newTensor:narrow(3, 1, fixedSize):copy(input[1])
        end
        newTensor:narrow(3, fixedSize, sequenceSize):copy(input[2][n])
        table.insert(mergedSequence, newTensor)
    end

    self.output = mergedSequence
    return self.output
end


function MergeFixedIntoSequence:updateGradInput(input, gradOutput)
    -- Make sure that the first entry is a tensor, second is a table
    assert(torch.type(input[1]) == 'tensor')
    assert(torch.type(input[2]) == 'table')

    local fixedSize = input[1]:size()[3]
    local sequenceSize = input[2][1]:size()[3]
    local batchSize = input[1]:size()[2]

    -- Break apart the gradients for each entry
    local fixedGradients = torch.Tensor(1, batchSize, fixedSize)
    local sequenceGradients = {}
    for n = 1, #input[2] do
        local sequenceItem = input[2][n]
        local fixedGradientPortion = sequenceItem:narrow(3, 1, fixedSize)
        local sequenceGradientPortion = sequenceItem:narrow(3, fixedSize, sequenceSize)
        fixedGradients:add(fixedGradientPortion)
        table.insert(sequenceGradients, sequenceGradientPortion)
    end

    fixedGradients:div(#input[2])

    self.gradInput = {fixedGradients, sequenceGradients}
    return self.gradInput
end

function MergeFixedIntoSequence:clearState()
    -- don't call set because it might reset referenced tensors
    local function clear(f)
        if self[f] then
            if torch.isTensor(self[f]) then
                self[f] = self[f].new()
            elseif type(self[f]) == 'table' then
                self[f] = {}
            else
                self[f] = nil
            end
        end
    end
    clear('output')
    clear('gradInput')
    return self
end
